# GentleTap

AI-native payment collection for freelancers. **Python (FastAPI)** brain + **Next.js** UI.

## Production deploy (Docker on VPS)

```bash
cd /opt/gentletap
cp .env.example .env   # edit secrets + your domain/IP
docker compose down
docker compose up -d --build
docker ps
```

- Web: `http://YOUR_IP:3000`
- API: `http://YOUR_IP:8000`
- API docs: `http://YOUR_IP:8000/docs`

Set `API_URL`, `WEB_URL`, `CORS_ORIGINS`, and OAuth redirect URIs to your public domain (use `https://` when TLS is enabled). The web app proxies `/v1/*` to the API via `API_PROXY_URL` so the browser never makes insecure HTTP requests from an HTTPS page.

If you terminate TLS with nginx, proxy **all** paths (including `/v1`) to the web container on port 3000 — not directly to port 8000.

## Quick start (local dev)

**One command setup (Windows):**

```powershell
cd c:\Users\HomePC\Music\GentleTap
.\scripts\setup.ps1
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

### Prerequisites

- **Docker Desktop** (Postgres + Redis)
- **Python 3.12+** ([python.org](https://www.python.org/downloads/) — tick "Add to PATH")
- **Node.js 20+**

## Project structure

```
gentletap/
├── BUILD_PLAN.md      # Full product + tech plan
├── docker-compose.yml
├── apps/
│   ├── api/           # FastAPI + intelligence engine
│   └── web/           # Next.js frontend
```

## Week 1 status

- [x] Monorepo scaffold + setup script
- [x] FastAPI auth (register/login/me)
- [x] Intelligence engine + preview API
- [x] Alembic migration (profiles, quickbooks_connections)
- [x] Landing page + signup + login + onboarding + dashboard
- [ ] QuickBooks OAuth (Week 2 — needs Intuit keys from Yusuf)

Partner: **Yusuf** — product guidance & QA.
