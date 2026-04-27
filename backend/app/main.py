"""FastAPI entry point.

    uvicorn app.main:app --reload --port 8000

Wires:
    - logging
    - CORS for the configured frontend origin(s)
    - the health and processing routers
    - a structured JSON error handler
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.routers import health, processing

settings = get_settings()
configure_logging(settings.log_level)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Control Sheet Automation Portal — API",
    version="0.1.0",
    description=(
        "Internal API for automated processing of Excel control sheets. "
        "Accepts an .xlsx upload + incident metadata, returns a processed "
        "workbook and persists an audit row to Supabase."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

app.include_router(health.router)
app.include_router(processing.router)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Return validation errors as a flat `{"detail": "..."}` for the frontend."""
    first = exc.errors()[0] if exc.errors() else {"msg": "Invalid request."}
    return JSONResponse(
        status_code=422,
        content={"detail": first.get("msg", "Invalid request.")},
    )


@app.on_event("startup")
async def _on_startup() -> None:
    logger.info(
        "Control Sheet API starting (env=%s, cors=%s)",
        settings.app_env, settings.cors_origins,
    )
