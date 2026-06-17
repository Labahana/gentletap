# GentleTap

AI-native payment collection for freelancers. **Python (FastAPI)** brain + **Next.js** UI.

## Production deploy (Docker + Supabase Postgres)

1. Create a [Supabase](https://supabase.com) project and set **one** connection string in `.env`:
   - `DATABASE_URL` — Supabase **Direct** connection (port **5432**), prefix `postgresql+psycopg2://`, add `?sslmode=require`
   - `SKIP_DB_MIGRATIONS=true` — skip Alembic on every container restart (recommended once schema exists)
   - **First deploy on empty DB:** run once: `docker compose run --rm api alembic upgrade head`
   - Optional `DATABASE_MIGRATIONS_URL` only if you use the transaction pooler (`:6543`) for runtime

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

### Paddle billing

1. Create products/prices in [Paddle](https://developer.paddle.com/) (sandbox first).
2. Set `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, price IDs, and `PADDLE_ENVIRONMENT=sandbox` in `.env`.
3. Add webhook destination: `{API_URL}/v1/webhooks/paddle` — subscribe to `subscription.*` and `transaction.completed`.
4. Approve your default checkout payment link in Paddle → Checkout settings.
5. Run migration `008`: `docker compose run --rm api alembic upgrade head`

Customer portal (“Manage subscription”) uses Paddle portal sessions — no extra frontend SDK required.

## Production features

- QuickBooks OAuth + invoice sync (Celery)
- Gmail / Resend email send
- OpenAI reminder generation
- Autonomous reminder sequences (Day 0/3/7/14/21)
- Payment detection + sequence stop
- Paddle billing (Pro / Pro+ / Team)
- Live dashboard (green/yellow/red)

Partner: **Yusuf** — product guidance & QA.
