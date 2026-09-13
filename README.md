# GentleTap

AI-native payment collection for freelancers. **FastAPI** backend + **Vite/React** frontend, with Postgres, Redis/Celery, and a Caddy reverse proxy (automatic HTTPS).

## Architecture

| Service | Tech | Notes |
|---|---|---|
| `web` | Vite + React (nginx) | Serves the SPA and proxies `/api/*` → `api` |
| `api` | FastAPI | Routes mounted at `/api/v1/*`; health at `/health` |
| `worker` | Celery | Reminders, sync, digests, payment detection |
| `beat` | Celery beat | Schedules periodic tasks |
| `postgres` | PostgreSQL 16 | Bundled in compose (no external DB needed) |
| `redis` | Redis 7 | Celery broker + rate-limiter store |
| `proxy` | Caddy | Reverse proxy on 80/443 with automatic Let's Encrypt TLS |

All routing is via the `proxy` (Caddy) on standard ports 80/443. Caddy forwards to `web`, and the web container's nginx serves the frontend and proxies `/api/*` to the API internally — so SPA routes, API calls, webhooks, and OAuth callbacks all share one public origin.

## Production deploy

```bash
# 1. Point your DNS A record at the VPS IP first (Caddy needs it for the cert).

# 2. Get the code
git clone https://github.com/Labahana/gentletap.git /opt/gentletap
cd /opt/gentletap

# 3. Configure environment
cp .env.example .env
nano .env   # fill secrets below

# 4. Build & start everything (Caddy auto-provisions TLS)
docker compose up -d --build

# 5. Verify
docker compose ps          # postgres, redis, api, worker, beat, web, proxy all Up/healthy
curl -s https://<domain>/health
```

There is no separate migration step — the API entrypoint bootstraps the base schema (`create_all`) and then applies Alembic migrations automatically, on every start (idempotent). Fresh, existing, and upgraded databases all work with `docker compose up -d --build`.

### Required `.env` values in production

The app fails fast in production if any of these are unset (see `backend/scripts/security_check.py`):

- `SECRET_KEY`, `JWT_SECRET_KEY` — long random strings (`openssl rand -hex 32`)
- `TOKEN_ENCRYPTION_KEY` — a Fernet key (32-byte urlsafe base64):
  `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`
- `POSTGRES_PASSWORD`, `REDIS_PASSWORD`
- `ADMIN_API_KEY` — strong random value for `/admin` header auth
- `WEB_DOMAIN` — your public domain (used by Caddy); set `API_URL`/`WEB_URL`/`CORS_ORIGINS` to match

### OAuth redirect URIs (register these exact values with each provider)

| Provider | Redirect URI |
|---|---|
| QuickBooks / Intuit | `https://<domain>/api/v1/connections/quickbooks/callback` |
| FreshBooks | `https://<domain>/api/v1/connections/freshbooks/callback` |
| Google (Gmail connect) | `https://<domain>/api/v1/connections/google/callback` |
| Google (sign-in) | `https://<domain>/auth/google/callback` |

### Webhook URLs (register these with each provider)

| Provider | Webhook URL |
|---|---|
| Paddle | `https://<domain>/api/v1/webhooks/paddle` |
| Intuit / QuickBooks | `https://<domain>/api/v1/webhooks/quickbooks` |
| FreshBooks | `https://<domain>/api/v1/webhooks/freshbooks` |
| Resend | `https://<domain>/api/v1/webhooks/resend` |
| Twilio WhatsApp | `https://<domain>/api/v1/webhooks/twilio` |

Webhooks are fail-closed: they return 401 until the corresponding `*_WEBHOOK_SECRET`/verifier token in `.env` matches what the provider sends.

### Small VPS (1GB) note

The frontend build is memory-capped (`--max-old-space-size=1536`). Add 2GB swap before the first build if the VPS has only 1GB of RAM:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## Local development

```bash
# Terminal 1 — API
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend
npm install
npm run dev   # http://localhost:3000, proxies /api -> localhost:8000
```

For local Postgres/Redis you can still run the bundled ones:

```bash
docker compose up -d postgres redis
# then set DATABASE_URL=postgresql+psycopg2://gentletap:<pw>@localhost:5433/gentletap
```

## Project structure

```
gentletap/
├── backend/          # FastAPI app, Celery tasks, Alembic migrations, scripts
│   ├── app/          #    api/, models/, schemas/, services/, intelligence/, tasks/, workers/
│   ├── alembic/      #    migrations (delta tables/columns layered on create_all)
│   ├── scripts/      #    security_check.py (VPS audit)
│   └── docker-entrypoint.sh
├── frontend/         # Vite + React + TS + Tailwind
│   ├── src/          #    pages/, components/, lib/, stores/, data/ (SEO content)
│   └── nginx.conf    #    SPA + /api proxy (served by the web container)
├── deploy/           #    Caddyfile (reverse proxy + TLS)
├── docker-compose.yml
└── .env.example
```

## Security

- OpenAPI `/docs` and `/redoc` are disabled in production.
- JWT bearer auth (no cookie sessions); permissive CORS is safe because no ambient credentials are sent.
- Webhook signature verification (Paddle, Intuit, FreshBooks, Resend, Twilio) — fail-closed.
- Redis-backed rate limiting (auth, signup, admin, OAuth, affiliate endpoints).
- OAuth tokens (QuickBooks/FreshBooks/Google) encrypted at rest via Fernet.
- Admin allowlist (`ADMIN_EMAILS` / `X-Admin-Api-Key`) + audit log.