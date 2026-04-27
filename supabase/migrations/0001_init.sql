-- =============================================================================
-- Control Sheet Automation Portal — initial schema
-- Run this in the Supabase SQL editor on a fresh project.
-- =============================================================================

-- UUID generation
create extension if not exists "uuid-ossp";

-- -----------------------------------------------------------------------------
-- processing_history
-- One row per processed workbook. The download_path is the object key inside
-- the `processed-workbooks` Storage bucket; the backend mints short-lived
-- signed URLs on demand rather than storing them.
-- -----------------------------------------------------------------------------
create table if not exists public.processing_history (
    id              uuid primary key default uuid_generate_v4(),
    filename        text        not null,
    incident        text        not null,
    case_number     text        not null,
    download_path   text        not null,        -- storage object key
    file_size_bytes bigint,
    status          text        not null default 'success'
                                check (status in ('success', 'failed')),
    error_message   text,
    created_at      timestamptz not null default now()
);

create index if not exists processing_history_created_at_idx
    on public.processing_history (created_at desc);

create index if not exists processing_history_case_number_idx
    on public.processing_history (case_number);

-- -----------------------------------------------------------------------------
-- Row-Level Security
-- The backend uses the service_role key, which bypasses RLS. We still enable
-- RLS so that if the anon key is ever used by accident, no rows leak.
-- -----------------------------------------------------------------------------
alter table public.processing_history enable row level security;

-- No anon access. Add policies later if you expose this table to the frontend
-- directly (e.g. for a history view rendered client-side).

-- -----------------------------------------------------------------------------
-- Storage bucket
-- The bucket itself must be created via the Supabase dashboard (Storage → New
-- bucket → name: "processed-workbooks", public: false). Once it exists, the
-- service_role key has full access; no extra policies needed for backend use.
-- -----------------------------------------------------------------------------

comment on table public.processing_history is
    'Audit log of every control-sheet processing run.';
