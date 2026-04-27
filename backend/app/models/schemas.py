"""Pydantic schemas used by the API layer."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ProcessResponse(BaseModel):
    """Returned after a successful workbook processing run."""

    id: UUID
    filename: str
    incident: str
    case_number: str
    download_url: str = Field(
        ..., description="Signed URL to the processed workbook (short-lived)."
    )
    created_at: datetime


class HistoryItem(BaseModel):
    """One row from `processing_history`, decorated with a fresh signed URL."""

    id: UUID
    filename: str
    incident: str
    case_number: str
    status: str
    file_size_bytes: Optional[int] = None
    error_message: Optional[str] = None
    download_url: Optional[str] = None
    created_at: datetime


class HealthResponse(BaseModel):
    status: str = "ok"
    env: str


class ErrorResponse(BaseModel):
    detail: str
