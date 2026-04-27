"""Excel control-sheet processing engine.

Integrates the real business logic from app.py into the service-layer
architecture. The public interface — process_workbook(...) → ProcessingResult
— is unchanged so processing.py requires no modifications.

Business rules (sourced from app.py):
  1. RAG COLOR SHIFT   – columns F←G, G←H, H←default GREEN (solid fill).
  2. INCIDENT OVERRIDE – column B text drives H's RAG colour:
       • contains "SDP"                    → AMBER, write incident/case_no to I, J
       • contains "CRITICAL" or "URGENT"   → RED
  3. DATE ADVANCEMENT  – columns A (frequency) + C (last-run date):
       • Only runs on sheets whose column-A header looks like a frequency field.
       • Uses dateutil.relativedelta for correct monthly/quarterly arithmetic.
  4. MULTI-SHEET SAFETY – every worksheet is processed; rows that raise
       exceptions are skipped with a warning rather than aborting the request.
  5. FORMATTING PRESERVED – fill objects are copied with copy.copy() so
       openpyxl's shared-style internals are not corrupted.
"""

from __future__ import annotations

import logging
from copy import copy
from dataclasses import dataclass
from datetime import date
from io import BytesIO
from typing import Optional

from dateutil.relativedelta import relativedelta
from openpyxl import load_workbook
from openpyxl.styles import Color, PatternFill
from openpyxl.workbook import Workbook
from openpyxl.worksheet.worksheet import Worksheet

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# RAG colour constants — ARGB strings (opaque, Excel-compatible)
# ---------------------------------------------------------------------------

# GREEN is intentionally not hardcoded here.  The native green that already
# exists in the workbook is sampled from H2 at the start of each sheet and
# reused for every subsequent H reset, so the output always matches whatever
# shade the spreadsheet owner chose.  See _sample_native_green().
AMBER = "FFFFC000"
RED   = "FFFF0000"

def _solid(argb: str) -> PatternFill:
    """Return a new solid PatternFill for the given ARGB hex string."""
    return PatternFill(fill_type="solid", fgColor=Color(argb))


def _sample_native_green(sheet: Worksheet) -> PatternFill:
    """Return a copy of the fill currently in H2, used as the 'reset' green.

    H2 is the first data row of the H (current-week RAG) column and is
    assumed to carry the workbook's canonical green before any processing
    run.  If H2 has no fill (fill_type is None or 'none'), we fall back to
    the Excel standard green so the column is never left blank.
    """
    h2_fill = sheet["H2"].fill
    if h2_fill and h2_fill.fill_type not in (None, "none"):
        return copy(h2_fill)
    # Fallback: Excel's standard green — only reached on brand-new sheets
    return PatternFill(fill_type="solid", fgColor=Color("FF70AD47"))


# ---------------------------------------------------------------------------
# Column layout
# ---------------------------------------------------------------------------

# RAG shift target columns
COL_F, COL_G, COL_H = "F", "G", "H"

# Keyword check
COL_REPORT_TEXT = "B"

# Incident / case output
COL_INCIDENT  = "I"
COL_CASE_NO   = "J"

# Date-advancement columns (present on some sheets)
COL_LAST_RUN  = "A"   # date cell to be advanced
COL_FREQUENCY = "C"   # e.g. "Daily -1", "Weekly Mon/Wed/Fri", "Monthly -1st" …

# ---------------------------------------------------------------------------
# Explicit frequency catalogue  (sourced from standalone app.py)
# ---------------------------------------------------------------------------
# Keys are the *normalised* (lower-cased, stripped) strings that appear in
# column C of the control sheet.  Values are callables (date) → date so that
# "Monthly -1st" and "Monthly -15th" can do proper calendar arithmetic
# instead of adding a fixed number of days.
# ---------------------------------------------------------------------------

from calendar import monthrange as _monthrange  # local import to keep top clean


def _next_weekday(d: date, weekday: int) -> date:
    """Return the next occurrence of `weekday` (0=Mon … 6=Sun) after `d`."""
    days_ahead = weekday - d.weekday()
    if days_ahead <= 0:
        days_ahead += 7
    return d + relativedelta(days=days_ahead)


def _month_last_day(d: date) -> date:
    return d.replace(day=_monthrange(d.year, d.month)[1])


# Each entry maps a normalised frequency label to a (date) -> date function.
FREQUENCY_HANDLERS: dict[str, object] = {
    # ---- Daily variants -------------------------------------------------
    "daily -1":          lambda d: d + relativedelta(days=1),
    "daily":             lambda d: d + relativedelta(days=1),   # bare alias
    "daily -2":          lambda d: d + relativedelta(days=2),
    "daily -3":          lambda d: d + relativedelta(days=3),

    # ---- Weekly variants ------------------------------------------------
    # Plain "weekly" advances by exactly 7 days.
    "weekly":            lambda d: d + relativedelta(weeks=1),
    # Named-day variants jump to the next occurrence of that weekday.
    "weekly monday":     lambda d: _next_weekday(d, 0),
    "weekly tuesday":    lambda d: _next_weekday(d, 1),
    "weekly wednesday":  lambda d: _next_weekday(d, 2),
    "weekly thursday":   lambda d: _next_weekday(d, 3),
    "weekly friday":     lambda d: _next_weekday(d, 4),
    "weekly saturday":   lambda d: _next_weekday(d, 5),
    "weekly sunday":     lambda d: _next_weekday(d, 6),
    # Common shorthand combos seen in control sheets
    "weekly mon/wed/fri": lambda d: _next_weekday(d, 0),   # advance to next Mon
    "weekly tue/thu":     lambda d: _next_weekday(d, 1),   # advance to next Tue

    # ---- Fortnightly ----------------------------------------------------
    "fortnightly":       lambda d: d + relativedelta(weeks=2),

    # ---- Monthly variants -----------------------------------------------
    # "Monthly -1st"  → first day of next month
    "monthly -1st":      lambda d: (d + relativedelta(months=1)).replace(day=1),
    # "Monthly -15th" → 15th of next month
    "monthly -15th":     lambda d: (d + relativedelta(months=1)).replace(day=15),
    # "Monthly -last" → last calendar day of next month
    "monthly -last":     lambda d: _month_last_day(d + relativedelta(months=1)),
    # Plain "monthly" → same day next month (dateutil handles short months)
    "monthly":           lambda d: d + relativedelta(months=1),

    # ---- Quarterly ------------------------------------------------------
    "quarterly":         lambda d: d + relativedelta(months=3),

    # ---- Annual ---------------------------------------------------------
    "annually":          lambda d: d + relativedelta(years=1),
    "yearly":            lambda d: d + relativedelta(years=1),
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

@dataclass
class ProcessingResult:
    """Return value of process_workbook — consumed by processing.py."""

    content: bytes
    sheets_processed: int
    rows_touched: int


def process_workbook(
    *,
    source_bytes: bytes,
    incident: str,
    case_number: str,
) -> ProcessingResult:
    """Apply all transformations and return the processed workbook as bytes.

    Parameters
    ----------
    source_bytes:
        Raw ``.xlsx`` content as uploaded by the client.
    incident:
        Free-text incident description — written to column I on qualifying rows.
    case_number:
        Case reference — written to column J on qualifying rows.

    Returns
    -------
    ProcessingResult
        ``content``          – processed workbook bytes (ready to upload / stream).
        ``sheets_processed`` – number of worksheets visited.
        ``rows_touched``     – aggregate data rows modified across all sheets.
    """
    logger.info(
        "Processing workbook: incident=%r case_number=%r size=%d bytes",
        incident, case_number, len(source_bytes),
    )

    workbook: Workbook = load_workbook(
        filename=BytesIO(source_bytes),
        data_only=False,   # preserve formulas
        keep_vba=False,
    )

    total_rows_touched = 0

    for sheet in workbook.worksheets:
        logger.info("Processing sheet: %r  max_row=%s", sheet.title, sheet.max_row)
        touched = _process_sheet(
            sheet,
            incident=incident,
            case_number=case_number,
        )
        total_rows_touched += touched
        logger.info("Sheet %r: %d rows touched", sheet.title, touched)

    output = BytesIO()
    workbook.save(output)
    payload = output.getvalue()

    logger.info(
        "Finished: sheets=%d rows_touched=%d output_bytes=%d",
        len(workbook.worksheets), total_rows_touched, len(payload),
    )

    return ProcessingResult(
        content=payload,
        sheets_processed=len(workbook.worksheets),
        rows_touched=total_rows_touched,
    )


# ---------------------------------------------------------------------------
# Sheet-level orchestration
# ---------------------------------------------------------------------------

def _process_sheet(
    sheet: Worksheet,
    *,
    incident: str,
    case_number: str,
) -> int:
    """Run all transformations over a single worksheet.

    Returns the number of data rows touched.
    """
    if not sheet.max_row or sheet.max_row < 2:
        return 0   # empty or header-only sheet — nothing to do

    touched = 0
    date_sheet = _sheet_has_date_column(sheet)
    # Sample H2 once per sheet so every H reset uses the workbook's own green.
    native_green_fill = _sample_native_green(sheet)

    for row_idx in range(2, sheet.max_row + 1):
        try:
            row_touched = _process_row(
                sheet,
                row_idx=row_idx,
                incident=incident,
                case_number=case_number,
                advance_dates=date_sheet,
                native_green_fill=native_green_fill,
            )
            if row_touched:
                touched += 1
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Skipping row %d on sheet %r due to error: %s",
                row_idx, sheet.title, exc,
            )

    return touched


# ---------------------------------------------------------------------------
# Row-level transformations
# ---------------------------------------------------------------------------

def _process_row(
    sheet: Worksheet,
    *,
    row_idx: int,
    incident: str,
    case_number: str,
    advance_dates: bool,
    native_green_fill: PatternFill,
) -> bool:
    """Apply all rules to a single data row.

    Returns True if any cell in the row was modified.
    """
    modified = False

    # ------------------------------------------------------------------ #
    # 1. RAG colour shift  F ← G ← H ← native green (sampled from H2)   #
    # ------------------------------------------------------------------ #
    cell_f = sheet[f"{COL_F}{row_idx}"]
    cell_g = sheet[f"{COL_G}{row_idx}"]
    cell_h = sheet[f"{COL_H}{row_idx}"]

    cell_f.fill = copy(cell_g.fill)
    cell_g.fill = copy(cell_h.fill)
    cell_h.fill = copy(native_green_fill)   # workbook's own green, not hardcoded
    modified = True

    # ------------------------------------------------------------------ #
    # 2. Incident override based on column B text                        #
    # ------------------------------------------------------------------ #
    report_text = str(sheet[f"{COL_REPORT_TEXT}{row_idx}"].value or "").upper()

    if "SDP" in report_text:
        # AMBER override + write incident metadata
        cell_h.fill = _solid(AMBER)
        sheet[f"{COL_INCIDENT}{row_idx}"] = incident
        sheet[f"{COL_CASE_NO}{row_idx}"]  = case_number

    # CRITICAL / URGENT takes precedence over SDP if both appear
    if "CRITICAL" in report_text or "URGENT" in report_text:
        cell_h.fill = _solid(RED)

    # ------------------------------------------------------------------ #
    # 3. Date advancement (only on sheets that carry a frequency column) #
    # ------------------------------------------------------------------ #
    if advance_dates:
        _advance_date(sheet, row_idx)

    return modified


# ---------------------------------------------------------------------------
# Date advancement helper
# ---------------------------------------------------------------------------

def _sheet_has_date_column(sheet: Worksheet) -> bool:
    """Return True when column C row 1 looks like a frequency header.

    Checks col C (the frequency column) rather than col A so the heuristic
    stays in sync with the corrected COL_FREQUENCY assignment above.
    """
    header = sheet[f"{COL_FREQUENCY}1"].value
    if not isinstance(header, str):
        return False
    h = header.strip().lower()
    return "frequency" in h or "freq" in h


def _advance_date(sheet: Worksheet, row_idx: int) -> None:
    """Advance the date in COL_LAST_RUN (col A) using the handler for
    the frequency label in COL_FREQUENCY (col C).

    Silently skips the row when:
    - the frequency string is absent or unrecognised, or
    - the last-run cell does not contain a date object.
    """
    freq_raw = sheet[f"{COL_FREQUENCY}{row_idx}"].value
    frequency = _normalise(freq_raw)
    if not frequency:
        return

    handler = FREQUENCY_HANDLERS.get(frequency)
    if handler is None:
        logger.debug(
            "Unrecognised frequency %r on row %d — skipping date advance",
            freq_raw, row_idx,
        )
        return

    last_run_cell = sheet[f"{COL_LAST_RUN}{row_idx}"]
    current = last_run_cell.value

    if not isinstance(current, date):
        return   # blank or text — leave untouched

    last_run_cell.value = handler(current)


# ---------------------------------------------------------------------------
# Micro-utilities
# ---------------------------------------------------------------------------

def _normalise(value: object) -> Optional[str]:
    """Lowercase + strip a cell value; return None if not a non-empty string."""
    if not isinstance(value, str):
        return None
    return value.strip().lower() or None
