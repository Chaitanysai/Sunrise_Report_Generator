"""Application configuration loaded from environment variables.

We use `pydantic-settings` so that misconfiguration fails loudly at startup
rather than at the first request.
"""

from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_CORS_ORIGINS = [
    "http://localhost:3000",
    "https://sunrise-report-generator.vercel.app",
]


class Settings(BaseSettings):
    """Runtime configuration. All values come from the environment."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Server ---
    app_env: str = "development"
    port: int = 8000
    log_level: str = "info"
    cors_origins: List[str] = Field(default_factory=lambda: DEFAULT_CORS_ORIGINS.copy())

    # --- Supabase ---
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_bucket: str = "processed-workbooks"
    download_url_ttl_seconds: int = 3600

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value):
        """Allow CORS_ORIGINS to be a comma-separated string in .env."""
        if isinstance(value, str):
            value = [origin.strip() for origin in value.split(",") if origin.strip()]
        if isinstance(value, list):
            merged: list[str] = []
            for origin in [*value, *DEFAULT_CORS_ORIGINS]:
                if origin and origin not in merged:
                    merged.append(origin)
            return merged
        return DEFAULT_CORS_ORIGINS.copy()


@lru_cache
def get_settings() -> Settings:
    """Cached accessor — instantiated once per process."""
    return Settings()  # type: ignore[call-arg]
