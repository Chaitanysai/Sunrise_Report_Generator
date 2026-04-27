# Integrating your existing `app.py`

The placeholder workbook logic lives entirely in:

    backend/app/services/workbook_processor.py

Nothing else in the codebase needs to know how the processing works —
the API route, the Supabase persistence, the file return, and the
history audit trail are all driven by this module's `process_workbook`
function.

## Recommended path

1. Open `workbook_processor.py`.
2. Find the three placeholder functions:
   - `_shift_rag_colors(sheet)`
   - `_update_dates_by_frequency(sheet)`
   - `_write_incident_fields(sheet, incident, case_number)`
3. Replace their bodies with your real logic from `app.py`.

If your `app.py` is structured as a single big function rather than
three discrete steps, that's fine too — just call your function from
inside `process_workbook` after the workbook is loaded:

```python
from your_module import run_my_existing_logic

def process_workbook(*, source_bytes, incident, case_number):
    workbook = load_workbook(BytesIO(source_bytes), data_only=False, keep_vba=False)
    run_my_existing_logic(workbook, incident=incident, case_number=case_number)
    output = BytesIO()
    workbook.save(output)
    return ProcessingResult(
        content=output.getvalue(),
        sheets_processed=len(workbook.worksheets),
        rows_touched=0,
    )
```

## Things to keep when refactoring

- **Load the workbook from `BytesIO`**, not a temp file. The API
  receives bytes, and we need to send bytes back.
- **Save the workbook to `BytesIO`** for the same reason — see
  `process_workbook`'s tail section.
- **Don't change the function signature**. Keyword-only args
  (`*, source_bytes, incident, case_number`) are what
  `routers/processing.py` calls into.
- **Use `keep_vba=False`** unless your sheets contain macros — it's
  faster and safer.
- **Preserve styling**: openpyxl preserves cell styles, conditional
  formatting, named ranges, and number formats automatically as long
  as you don't replace cells wholesale. If you find styles disappearing
  after your transformations, it's usually because something is being
  re-assigned where it should be mutated in place.

## What you do NOT need to touch

- `routers/processing.py` — it owns upload validation, calling
  `process_workbook`, uploading to Supabase Storage, persisting the
  history row, and returning the signed URL.
- `services/supabase_service.py` — Storage + DB plumbing.
- The frontend — it's a thin client over the API.
