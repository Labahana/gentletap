# GentleTap

AI-native payment collection for freelancers. **Python (FastAPI)** brain + **Next.js** UI.

## Production deploy (Docker + Supabase Postgres)

1. Create a [Supabase](https://supabase.com) project and copy connection strings into `.env`:
   - `DATABASE_URL` — Transaction pooler (port **6543**) for the API/worker
   - `DATABASE_MIGRATIONS_URL` — Direct/session connection (port **5432**) for Alembic

2. Deploy on your VPS:

```bash
cd /opt/gentletap
cp .env.example .env   # fill Supabase + secrets + OAuth keys
docker compose up -d --build
docker ps              # api, web, worker, beat, redis should be Up
```

- Web: `https://gentletap.co` (nginx → port 3000)
- API docs: proxied at `https://gentletap.co/v1/health`

Set `API_URL`, `WEB_URL`, `CORS_ORIGINS`, and OAuth redirect URIs to your public domain.

**Important:** nginx must proxy **all** paths (including `/v1/*`) to the web container on port 3000 — not directly to port 8000. See [deploy/nginx.conf.example](./deploy/nginx.conf.example).

### Local dev (Docker Postgres)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

Then run API and web natively (see below) with `DATABASE_URL=postgresql+psycopg2://gentletap:gentletap@localhost:5433/gentletap`.

## Quick start (local dev)

**One command setup (Windows):**

```powershell
cd c:\Users\HomePC\Music\GentleTap
.\scripts\setup.ps1
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

Then open **two terminals**:

```powershell
# Terminal 1 — API
cd apps\api
.\.venv\Scripts\uvicorn gentletap.main:app --reload --port 8000

# Terminal 2 — Web
cd apps\web
npm run dev
```

- Landing: http://localhost:3000  
- API docs: http://localhost:8000/docs  
- Checklist: [TODO.md](./TODO.md)  
- Research: [RESEARCH.md](./RESEARCH.md)

### Prerequisites

- **Docker Desktop** (Postgres + Redis for local dev)
- **Python 3.12+**
- **Node.js 20+**
- **Celery worker** (for reminders): `celery -A gentletap.tasks.celery_app worker -l info`

## Project structure

```
gentletap/
├── BUILD_PLAN.md
├── RESEARCH.md
├── docker-compose.yml          # Production (Supabase)
├── docker-compose.dev.yml      # Local Postgres overlay
├── apps/
│   ├── api/                    # FastAPI + intelligence + Celery
│   └── web/                    # Next.js frontend
```

## Production features

- QuickBooks OAuth + invoice sync (Celery)
- Gmail / Resend email send
- OpenAI reminder generation
- Autonomous reminder sequences (Day 0/3/7/14/21)
- Payment detection + sequence stop
- Stripe Pro billing ($19/mo)
- Live dashboard (green/yellow/red)

Partner: **Yusuf** — product guidance & QA.
