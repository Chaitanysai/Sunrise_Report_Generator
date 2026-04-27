"""FastAPI dependency callables.

These keep the route signatures clean and let us swap implementations in
tests without monkeypatching imports.
"""

from __future__ import annotations

from functools import lru_cache

from fastapi import Depends

from app.core.config import Settings, get_settings
from app.services.supabase_service import SupabaseService


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
    return _build_supabase_service(id(settings))
