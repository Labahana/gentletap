# GentleTap — Yusuf's build checklist

## ✅ Done (Week 1 foundation)

- [x] Monorepo: `apps/api` (Python) + `apps/web` (Next.js)
- [x] Docker Compose: Postgres + Redis
- [x] FastAPI: auth, health, onboarding status, QB stubs
- [x] Intelligence engine: decide(), risk, tone, message generator
- [x] Intelligence preview API: `POST /v1/intelligence/preview`
- [x] Alembic migration: profiles, quickbooks_connections
- [x] Landing page + signup + login + onboarding wizard + dashboard
- [x] Live preview on homepage (calls Python API)

## 🔜 Week 2 — QuickBooks (Yusuf: get Intuit keys)

- [ ] Create app at [developer.intuit.com](https://developer.intuit.com)
- [ ] Add `INTUIT_CLIENT_ID` + `INTUIT_CLIENT_SECRET` to `.env`
- [ ] Implement OAuth connect + callback
- [ ] Sync unpaid invoices query
- [ ] Import progress UI wired to real data
- [ ] Webhook endpoint + payment detection

## 🔜 Week 3 — Email

- [ ] Google OAuth + Gmail send
- [ ] Resend sender verification
- [ ] Email router in Python

## 🔜 Week 4 — Reminders live

- [ ] Celery beat schedule
- [ ] Approve-all → activate sequences
- [ ] Dashboard with real invoice rows

## 🔜 Week 5+ — Billing, beta

- [ ] Stripe $19/mo
- [ ] Free tier gate (5 invoices)
- [ ] Beta users from Reddit/LinkedIn

---

## Yusuf action items (today)

1. **Install Python 3.12** from [python.org](https://www.python.org/downloads/) — check "Add to PATH"
2. **Start Docker Desktop** → then `docker compose up -d`
3. **Copy env:** `copy .env.example .env` and generate secrets (see README)
4. **Run API:** see `scripts/setup.ps1`
5. **Run web:** `cd apps\web` → `npm install` → `npm run dev`
6. **Register** at http://localhost:3000/signup — test full flow

## Partner notes

- Product decisions → update BUILD_PLAN.md or ping in chat
- QA: signup → onboarding → dashboard → homepage preview with API running
- Intuit + Google developer accounts — Yusuf owns credentials
