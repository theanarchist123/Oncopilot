from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path


class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite+aiosqlite:///./oncopilot.db"
    supabase_url: str = "https://placeholder.supabase.co"
    supabase_key: str = "placeholder-key"
    supabase_bucket: str = "case-reports"

    # JWT
    secret_key: str = "dev-secret-key-change-in-production-oncopilot-2026"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # App
    app_env: str = "development"
    debug: bool = False
    allowed_origins: str = "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004,http://localhost:3005"

    # AI & OCR
    ocr_space_api_key: str = "K85368802888957"
    gemini_api_key: str = ""
    ollama_api_key: str = ""

    # Rate limiting
    rate_limit_per_minute: int = 60

    @property
    def origins_list(self) -> list[str]:
        origins: list[str] = []
        for origin in self.allowed_origins.split(","):
            normalized = origin.strip()
            if not normalized:
                continue
            origins.append(normalized)
            if "localhost" in normalized:
                origins.append(normalized.replace("localhost", "127.0.0.1"))
            elif "127.0.0.1" in normalized:
                origins.append(normalized.replace("127.0.0.1", "localhost"))
        return list(dict.fromkeys(origins))

    model_config = {"env_file": str(Path(__file__).resolve().parent.parent / ".env"), "case_sensitive": False}


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
