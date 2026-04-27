"""Application configuration loaded from environment variables.

We use `pydantic-settings` so that misconfiguration fails loudly at startup
rather than at the first request.
"""

from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


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
    cors_origins: List[str] = Field(default_factory=lambda: ["http://localhost:3000"])

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
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    """Cached accessor — instantiated once per process."""
    return Settings()  # type: ignore[call-arg]
