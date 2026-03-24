"""
config.py — Application Settings

Loads all environment variables via pydantic-settings.
Every secret / connection string lives in .env and is validated here at startup.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # ── App ──────────────────────────────────────────────
    APP_NAME: str = "DhanSathi"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # ── Database ─────────────────────────────────────────
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/financeiq"

    # ── JWT ──────────────────────────────────────────────
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # ── External APIs ────────────────────────────────────
    ALPHA_VANTAGE_API_KEY: str = ""

    # ── CORS ─────────────────────────────────────────────
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # ── AI / LLM (Virtual CFO) ───────────────────────────
    AI_PROVIDER: str = "openai"          # Always use "openai" (works with OpenRouter too)
    OPENAI_API_KEY: str = ""             # OpenRouter or OpenAI API key
    OPENAI_MODEL: str = "openai/gpt-4o-mini"  # For OpenRouter: "openai/gpt-4o-mini" or "anthropic/claude-3.5-sonnet"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance — created once, reused everywhere."""
    return Settings()
