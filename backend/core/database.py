from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from core.config import settings

_db_url = settings.database_url
# Vercel / Supabase provide plain postgresql:// URLs — force asyncpg dialect
if _db_url.startswith("postgresql://") or _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgresql://", "postgresql+asyncpg://", 1).replace("postgres://", "postgresql+asyncpg://", 1)

_is_postgres = _db_url.startswith("postgresql")

_engine_kwargs = {"echo": settings.debug}
if _is_postgres:
    _engine_kwargs.update(
        {
            "pool_size": 10,
            "max_overflow": 20,
            "pool_pre_ping": True,
            "connect_args": {
                "prepared_statement_cache_size": 0,
                "statement_cache_size": 0,
            },
        }
    )

engine = create_async_engine(_db_url, **_engine_kwargs)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
