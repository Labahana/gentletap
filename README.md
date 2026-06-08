# GentleTap

AI-native payment collection for freelancers. **Python (FastAPI)** brain + **Next.js** UI.

## Quick start (Yusuf + team)

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
