"""
main.py — CancerCopilot FastAPI application entry point.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from core.config import settings
from core.database import engine, Base

# Import all models so Alembic/SQLAlchemy sees them
import models  # noqa: F401

# Routes
from api.routes import auth, cases, patient, clinical, analysis, instant_analysis, reports, pdf, analytics, notifications, second_opinion
from api.routes import engine as engine_router

# ─── Rate limiter ────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=[f"{settings.rate_limit_per_minute}/minute"])


# ─── Lifespan ────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-migrate: add any missing columns + create missing tables.
    # Safe to run on every cold start (all statements are idempotent).
    from core.migrate import run_auto_migration
    await run_auto_migration(engine)
    yield
    await engine.dispose()


# ─── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="OnCopilot API",
    description="Clinical decision-support system for oncology.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — explicit origins so Authorization header is allowed cross-origin.
# Wildcard "*" blocks Authorization headers in browsers.
_allowed_origins = [
    # Frontend Vercel deployments
    "https://capstone-app-delta.vercel.app",
    "https://capstone-app.vercel.app",
    # Allow all *.vercel.app preview deployments
    "https://capstone-app-hqi3.vercel.app",
    # Local dev
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://127.0.0.1:3000",
]

# Also add any origins from config (dev overrides)
for _o in settings.origins_list:
    if _o not in _allowed_origins:
        _allowed_origins.append(_o)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",  # all vercel preview URLs
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
    expose_headers=["Content-Type"],
    max_age=600,
)


# ─── Global error handler ─────────────────────────────────────────────────────
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": exc.detail, "detail": str(exc.detail), "code": exc.status_code},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": "Internal server error", "detail": str(exc), "code": 500},
    )


# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(cases.router)
app.include_router(clinical.router)
app.include_router(patient.router)
app.include_router(analysis.router)
app.include_router(instant_analysis.router)
app.include_router(engine_router.router)
app.include_router(reports.router)
app.include_router(pdf.router)
app.include_router(analytics.router)
app.include_router(notifications.router)
app.include_router(second_opinion.router)


# ─── Health check — registered at both paths for compatibility ───────────────
@app.get("/health", tags=["health"])
@app.get("/api/health", tags=["health"])
async def health():
    return {"status": "ok", "service": "CancerCopilot API", "version": "1.0.0"}


# ─── Dev: Dataset validation stats ───────────────────────────────────────────
if settings.app_env == "development":
    @app.get("/api/dev/dataset-stats", tags=["dev"])
    async def dataset_stats():
        from engine.biomarker_algorithm import validate_against_dataset
        return validate_against_dataset()


# ─── Run ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=settings.debug)
