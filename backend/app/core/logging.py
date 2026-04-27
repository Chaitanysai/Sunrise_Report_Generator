"""Centralised logging setup.

Keeps log output uniform across uvicorn, fastapi, and our own modules.
"""

from __future__ import annotations

import logging
import sys


def configure_logging(level: str = "info") -> None:
    """Configure root + library loggers with a consistent format."""
    log_level = getattr(logging, level.upper(), logging.INFO)

    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S%z",
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(log_level)

    # Quiet noisy libraries unless we're debugging.
    for noisy in ("httpx", "httpcore", "openpyxl"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
