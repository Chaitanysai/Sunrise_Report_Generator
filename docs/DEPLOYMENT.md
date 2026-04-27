# Deployment notes

## Frontend → Vercel

The `frontend/` folder is a stock Next.js 14 App Router project; Vercel
auto-detects everything.

**Settings → General**
- Root Directory: `frontend`
- Framework Preset: Next.js (auto)

**Settings → Environment Variables**
- `NEXT_PUBLIC_API_BASE_URL` — the public URL of your deployed backend
  (e.g. `https://control-sheet-api.up.railway.app`)
- `NEXT_PUBLIC_DEMO_PASSWORD` — placeholder login password

## Backend → Railway

**New Project → Deploy from GitHub Repo**
- Root Directory: `backend`
- Railway will use `railway.json` + `Procfile` automatically.

**Environment Variables**
- `APP_ENV=production`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (mark as secret)
- `SUPABASE_BUCKET=processed-workbooks`
- `CORS_ORIGINS` — your Vercel URL (comma-separated for multiple)
- `DOWNLOAD_URL_TTL_SECONDS=3600`

After deploy, hit `https://<your-service>/health` — should return
`{"status":"ok","env":"production"}`.

## Backend → Render (alternative)

Render reads `backend/render.yaml`. Same env vars as Railway. Use the
"Build & Deploy" page to set the `sync: false` secrets.

## Supabase setup checklist

1. New project at https://supabase.com.
2. SQL editor → run `supabase/migrations/0001_init.sql`.
3. Storage → New bucket → name `processed-workbooks`, **private**.
4. Project Settings → API → copy `URL` + `service_role` into backend env.

## Smoke test

```bash
curl -F "file=@sample.xlsx" \
     -F "incident=Test run" \
     -F "case_number=INC-0001" \
     https://<your-backend>/api/process
```

You should get back JSON with `download_url` pointing at Supabase Storage.
