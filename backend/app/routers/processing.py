"""Workbook processing endpoints.

The main flow:

    1. Accept multipart upload (.xlsx) + form fields.
    2. Validate.
    3. Hand bytes to `workbook_processor.process_workbook(...)`.
    4. Upload result to Supabase Storage.
    5. Insert row into `processing_history`.
    6. Return JSON with a signed download URL.

A second endpoint streams the file directly for cases where the client
prefers a one-shot upload→download with no intermediate storage step.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from io import BytesIO
from typing import List
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse

from app.core.dependencies import get_supabase_service
from app.models.schemas import HistoryItem, ProcessResponse
from app.services.supabase_service import SupabaseService
from app.services.workbook_processor import process_workbook

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["processing"])

XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB — control sheets are small


# ---------------------------------------------------------------------------
# POST /api/process — main entry point used by the frontend
# ---------------------------------------------------------------------------
@router.post(
    "/process",
    response_model=ProcessResponse,
    status_code=status.HTTP_201_CREATED,
)
async def process_endpoint(
    file: UploadFile = File(..., description="The .xlsx control sheet to process."),
    incident: str = Form(..., min_length=1, max_length=2000),
    case_number: str = Form(..., min_length=1, max_length=100),
    supabase: SupabaseService = Depends(get_supabase_service),
) -> ProcessResponse:
    raw = await _read_validated_xlsx(file)

    try:
        result = process_workbook(
            source_bytes=raw,
            incident=incident.strip(),
            case_number=case_number.strip(),
        )
    except Exception:  # noqa: BLE001 — we want a graceful 500 with audit trail
        logger.exception("Workbook processing failed")
        try:
            supabase.insert_history(
                filename=file.filename or "unknown.xlsx",
                incident=incident,
                case_number=case_number,
                download_path="",
                file_size_bytes=len(raw),
                status="failed",
                error_message="Processing engine raised an exception.",
            )
        except Exception:  # noqa: BLE001
            logger.exception("Also failed to persist failure row")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process workbook.",
        )

    object_key = _build_object_key(case_number, file.filename or "control-sheet.xlsx")
    supabase.upload_workbook(object_key=object_key, content=result.content)

    history_row = supabase.insert_history(
        filename=file.filename or "control-sheet.xlsx",
        incident=incident.strip(),
        case_number=case_number.strip(),
        download_path=object_key,
        file_size_bytes=len(result.content),
    )

    download_url = supabase.signed_download_url(object_key)

    return ProcessResponse(
        id=history_row["id"],
        filename=history_row["filename"],
        incident=history_row["incident"],
        case_number=history_row["case_number"],
        download_url=download_url,
        created_at=history_row["created_at"],
    )


# ---------------------------------------------------------------------------
# POST /api/process/stream — process and stream the file back without storing
# ---------------------------------------------------------------------------
@router.post("/process/stream")
async def process_stream_endpoint(
    file: UploadFile = File(...),
    incident: str = Form(..., min_length=1, max_length=2000),
    case_number: str = Form(..., min_length=1, max_length=100),
) -> StreamingResponse:
    raw = await _read_validated_xlsx(file)
    try:
        result = process_workbook(
            source_bytes=raw,
            incident=incident.strip(),
            case_number=case_number.strip(),
        )
    except Exception:
        logger.exception("Workbook processing failed (stream mode)")
        raise HTTPException(status_code=500, detail="Failed to process workbook.")

    out_name = _suggested_filename(file.filename or "control-sheet.xlsx")
    return StreamingResponse(
        BytesIO(result.content),
        media_type=XLSX_MIME,
        headers={"Content-Disposition": f'attachment; filename="{out_name}"'},
    )


# ---------------------------------------------------------------------------
# GET /api/history — recent runs, with fresh signed URLs
# ---------------------------------------------------------------------------
@router.get("/history", response_model=List[HistoryItem])
def history_endpoint(
    limit: int = 50,
    supabase: SupabaseService = Depends(get_supabase_service),
) -> List[HistoryItem]:
    rows = supabase.list_history(limit=min(max(limit, 1), 200))
    items: List[HistoryItem] = []
    for row in rows:
        download_url: str | None = None
        if row.get("status") == "success" and row.get("download_path"):
            try:
                download_url = supabase.signed_download_url(row["download_path"])
            except Exception:  # noqa: BLE001
                logger.warning(
                    "Could not mint signed URL for %s", row["download_path"],
                )
        items.append(
            HistoryItem(
                id=row["id"],
                filename=row["filename"],
                incident=row["incident"],
                case_number=row["case_number"],
                status=row["status"],
                file_size_bytes=row.get("file_size_bytes"),
                error_message=row.get("error_message"),
                download_url=download_url,
                created_at=row["created_at"],
            )
        )
    return items


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------
async def _read_validated_xlsx(file: UploadFile) -> bytes:
    """Read the upload into memory after validating type and size."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename.")
    if not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Only .xlsx files are accepted.")
    if file.content_type and file.content_type not in {XLSX_MIME, "application/octet-stream"}:
        # Some browsers send octet-stream; allow it but reject obviously wrong types.
        raise HTTPException(status_code=400, detail="Unsupported content type.")

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large (>{MAX_UPLOAD_BYTES // (1024*1024)} MB).",
        )
    return raw


def _build_object_key(case_number: str, original_name: str) -> str:
    """Predictable, collision-resistant Storage key."""
    safe_case = "".join(ch for ch in case_number if ch.isalnum() or ch in "-_") or "case"
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
    suffix = uuid4().hex[:8]
    return f"{safe_case}/{stamp}-{suffix}-{_suggested_filename(original_name)}"


def _suggested_filename(original: str) -> str:
    base = original.rsplit("/", 1)[-1]
    if base.lower().endswith(".xlsx"):
        stem = base[:-5]
    else:
        stem = base
    return f"{stem}-processed.xlsx"
