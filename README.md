# Control Sheet Automation Portal

Internal web app for automating Excel control-sheet processing: upload an `.xlsx`,
fill in incident metadata, and download a processed workbook with shifted RAG
colors, updated dates, and populated incident/case fields. All runs are persisted
to Supabase for audit history.

## Stack

| Layer    | Tech                                            |
|----------|-------------------------------------------------|
| Frontend | Next.js 14 (App Router) · TypeScript · Tailwind |
| Backend  | FastAPI · Python 3.11 · openpyxl                |
| DB       | Supabase (Postgres + Storage)                   |
| Deploy   | Vercel (frontend) · Railway / Render (backend)  |

## Repository layout

```
control-sheet-portal/
├── frontend/          Next.js app (Vercel)
├── backend/           FastAPI app (Railway/Render)
├── supabase/          SQL migrations & schema
├── docs/              Deployment notes
└── README.md
```

## Local quickstart

You'll run three things: Supabase (cloud project is fine), the FastAPI backend,
and the Next.js frontend.

### 1. Supabase

1. Create a project at https://supabase.com.
2. In the SQL editor, run `supabase/migrations/0001_init.sql`.
3. Create a Storage bucket named `processed-workbooks` (private).
4. From **Project Settings → API**, copy the `URL`, `anon` key, and
   `service_role` key — you'll paste these into env files below.

### 2. Backend (FastAPI)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                # then fill in Supabase values
uvicorn app.main:app --reload --port 8000
```

Backend is now at `http://localhost:8000`. OpenAPI docs at `/docs`.

### 3. Frontend (Next.js)

```bash
cd frontend
npm install
cp .env.local.example .env.local    # then fill in values
npm run dev
```

Frontend is now at `http://localhost:3000`.

## Deployment

### Frontend → Vercel

1. Push this repo to GitHub.
2. In Vercel, import the repo and set the **Root Directory** to `frontend`.
3. Add environment variables from `.env.local.example`.
4. Deploy. Vercel auto-detects Next.js.

### Backend → Railway

1. New Project → Deploy from GitHub → select this repo.
2. Set the **Root Directory** to `backend`.
3. Add environment variables from `backend/.env.example`.
4. Railway uses the included `Procfile` and `railway.json`. Done.

### Backend → Render (alternative)

Render auto-detects via the included `render.yaml`. Point Render at the repo
and it will create a web service rooted at `backend/`.

## Where to plug in your real `app.py`

The processing engine lives at **`backend/app/services/workbook_processor.py`**.
It exposes a single entry point — `process_workbook(...)` — used by the API
route. The current implementation is a **clearly-marked best-guess** for:

- shifting F/G/H RAG fill colors
- recomputing dates from a frequency column
- writing the incident description and case number into named cells
- preserving styles via `openpyxl` (loaded with `keep_vba=False`, styles
  copied per-cell rather than overwritten)

When you have your existing `app.py`, replace the body of `process_workbook`
(or import your functions and call them from it). The function signature, the
API route, the Supabase persistence, and the download flow won't need changes.

## License

Internal use.
