"""FastAPI dependency callables.

These keep the route signatures clean and let us swap implementations in
tests without monkeypatching imports.
"""

from __future__ import annotations

from functools import lru_cache
import logging

from fastapi import Depends, HTTPException, status

from app.core.config import Settings, get_settings
from app.services.supabase_service import SupabaseService

logger = logging.getLogger(__name__)


@lru_cache
def _build_supabase_service(settings_id: int) -> SupabaseService:
    """Cache-keyed by `id(settings)` so we don't rebuild the client per req."""
    # The actual settings object is fetched fresh; we just need a stable cache
    # key. In practice `get_settings()` is itself cached, so this is one client
    # per process.
    return SupabaseService(get_settings())


def get_supabase_service(
    settings: Settings = Depends(get_settings),
) -> SupabaseService:
    try:
        return _build_supabase_service(id(settings))
    except Exception:  # noqa: BLE001
        logger.exception("Supabase dependency initialization failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Backend storage configuration failed.",
        )
