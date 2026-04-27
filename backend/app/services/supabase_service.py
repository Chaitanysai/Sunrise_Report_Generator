"""Thin wrapper around the Supabase Python client.

We isolate all Supabase calls here so the API layer stays clean and the
storage / DB plumbing is mockable in tests.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from supabase import Client, create_client

from app.core.config import Settings

logger = logging.getLogger(__name__)

_HISTORY_TABLE = "processing_history"


class SupabaseService:
    """Wraps the Supabase client for storage uploads and history persistence."""

    def __init__(self, settings: Settings):
        self._settings = settings
        if settings.supabase_url.rstrip("/").endswith("/rest/v1"):
            logger.warning(
                "SUPABASE_URL appears to be a REST endpoint (%s). "
                "Expected the project base URL like https://<project>.supabase.co.",
                settings.supabase_url,
            )
        try:
            self._client: Client = create_client(
                settings.supabase_url,
                settings.supabase_service_role_key,
            )
        except Exception:
            logger.exception(
                "Failed to create Supabase client (url=%s, key_present=%s)",
                settings.supabase_url,
                bool(settings.supabase_service_role_key),
            )
            raise

    # ------------------------------------------------------------------ storage

    def upload_workbook(
        self,
        *,
        object_key: str,
        content: bytes,
        content_type: str = (
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
    ) -> str:
        """Upload bytes to the configured Storage bucket and return the key."""
        bucket = self._client.storage.from_(self._settings.supabase_bucket)
        bucket.upload(
            path=object_key,
            file=content,
            file_options={
                "content-type": content_type,
                "x-upsert": "true",
            },
        )
        logger.info("Uploaded %d bytes to %s", len(content), object_key)
        return object_key

    def signed_download_url(self, object_key: str) -> str:
        """Mint a short-lived signed URL for an uploaded workbook."""
        bucket = self._client.storage.from_(self._settings.supabase_bucket)
        result = bucket.create_signed_url(
            path=object_key,
            expires_in=self._settings.download_url_ttl_seconds,
        )
        # supabase-py returns either {"signedURL": ...} or {"signedUrl": ...}
        # depending on version; guard against both.
        url = result.get("signedURL") or result.get("signedUrl")
        if not url:
            raise RuntimeError(f"Could not create signed URL for {object_key}")
        return url

    # ------------------------------------------------------------------ history

    def insert_history(
        self,
        *,
        filename: str,
        incident: str,
        case_number: str,
        download_path: str,
        file_size_bytes: int,
        status: str = "success",
        error_message: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Insert one row into `processing_history` and return it."""
        payload = {
            "filename": filename,
            "incident": incident,
            "case_number": case_number,
            "download_path": download_path,
            "file_size_bytes": file_size_bytes,
            "status": status,
            "error_message": error_message,
        }
        response = (
            self._client.table(_HISTORY_TABLE)
            .insert(payload)
            .execute()
        )
        if not response.data:
            raise RuntimeError("Insert into processing_history returned no row")
        return response.data[0]

    def list_history(self, *, limit: int = 50) -> List[Dict[str, Any]]:
        """Most-recent-first slice of the audit log."""
        try:
            response = (
                self._client.table(_HISTORY_TABLE)
                .select("*")
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
        except Exception:
            logger.exception(
                "Failed to query %s from Supabase (limit=%s, url=%s)",
                _HISTORY_TABLE,
                limit,
                self._settings.supabase_url,
            )
            raise
        return response.data or []

    def get_history(self, history_id: UUID) -> Optional[Dict[str, Any]]:
        response = (
            self._client.table(_HISTORY_TABLE)
            .select("*")
            .eq("id", str(history_id))
            .limit(1)
            .execute()
        )
        rows = response.data or []
        return rows[0] if rows else None
