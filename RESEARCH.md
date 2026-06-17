# GentleTap — Full Project Research

**Version:** 1.0  
**Date:** June 2026  
**Purpose:** Complete research reference for taking the hosted MVP to production — codebase audit, external services, infrastructure, costs, credentials, risks, and build order.

**Related docs:** [BUILD_PLAN.md](./BUILD_PLAN.md) (technical spec), [README.md](./README.md) (deploy/run), [TODO.md](./TODO.md) (checklist — partially stale).

---

## Executive summary

| Dimension | Finding |
|-----------|---------|
| **What exists** | Auth, marketing UI, onboarding shell, QB OAuth + initial sync, intelligence **rules** (not AI), Docker deploy, API proxy |
| **What is missing** | Email send, autonomous sequences, OpenAI messages, live dashboard, billing, webhooks, Celery workers, 7 of 11 DB tables |
| **Overall completion** | ~**15–20%** of full product |
| **Longest pole to launch** | Google OAuth verification (**2–4 weeks**) + reminder pipeline build |
| **Monthly infra cost at launch** | ~**$30–80** (0–20 users) → ~**$400–800** (~500 users) |
| **Critical correction** | Resend **cannot** send as user's personal Gmail — Gmail OAuth is required for "from my inbox" |

---

## Part 1 — Codebase audit

### Repository map

```
GentleTap/
├── apps/api/          FastAPI — ~15 endpoints
├── apps/web/          Next.js 16 — 6 pages, minimal deps
├── deploy/            nginx.conf.example only
├── scripts/           setup.ps1 + osint_reddit_leads.py
├── BUILD_PLAN.md      Full spec (935 lines) — ahead of implementation
├── TODO.md            Stale (marks QB as TODO; QB is partially built)
└── docker-compose.yml Postgres + Redis + API + Web (no Celery)
```

### Implemented and real (not stubs)

| Module | Completeness | Notes |
|--------|--------------|-------|
| Auth (register/login/JWT) | ~75% | No refresh tokens |
| QB OAuth | ~90% | httpx, CSRF in Redis, Fernet encryption, token refresh |
| QB invoice sync | ~65% | Unpaid invoices only; BackgroundTasks not Celery |
| Intelligence `decide()` | ~60% | Rules work; templates not AI |
| Risk + tone scoring | ~80% | MVP rules match product brief |
| Invoice summary API | 100% | Counts only, no list |
| Next.js `/v1` proxy | 100% | Correct HTTPS pattern |
| Docker production stack | ~70% | Missing worker + beat |

### Demo / placeholder / fake (must replace for production)

| Item | Location | Problem |
|------|----------|---------|
| Sarah demo preview | `POST /v1/intelligence/preview` | Unauthenticated, hardcoded data |
| Template messages | `message_generator.py` | Not OpenAI |
| Dashboard counts | `dashboard/page.tsx` | Hardcoded `0` |
| Email connect | `onboarding/page.tsx` step 3 | Buttons skip — no API |
| Approve & go live | `onboarding/page.tsx` `finish()` | Only `router.push("/dashboard")` |
| Skip QuickBooks | onboarding step 1 | Bypasses required integration |
| Celery | `tasks/celery_app.py` | `ping` task only |
| BANNED_PHRASES | `schemas.py` | Never enforced |

### API: implemented vs missing

**Live today (15 routes):**

```
GET  /                    GET  /v1/health
POST /v1/auth/register    POST /v1/auth/login         GET /v1/auth/me
GET  /v1/onboarding/status POST /v1/onboarding/persona
GET  /v1/quickbooks/connect-url  GET /v1/quickbooks/connect
GET  /v1/quickbooks/callback     POST /v1/quickbooks/disconnect
POST /v1/quickbooks/sync         GET  /v1/quickbooks/sync/status
GET  /v1/invoices/summary
POST /v1/intelligence/preview    ← demo only; remove or dev-gate
```

**Missing for production (22+ routes):**

```
Google:     GET /google/connect-url, GET /google/callback
Email:      POST /email/sender/verify, GET /email/sender/status, PUT /email/preferences
Invoices:   GET /invoices, GET /invoices/{id}, POST pause/resume/approve
Reminders:  GET /reminders/preview, PUT /reminders/{id}, POST approve-all
Billing:    POST /billing/checkout, GET /billing/portal, GET /billing/status
Webhooks:   POST /webhooks/quickbooks, /stripe, /resend
Auth:       POST /auth/refresh, POST /auth/logout
Escalations: GET /escalations, POST acknowledge
Notifications: GET /notifications
```

### Database: 4 of 11 tables

| Table | Status |
|-------|--------|
| `profiles` | ✅ |
| `quickbooks_connections` | ✅ |
| `clients` | ✅ — missing profile columns |
| `invoices` | ✅ — missing sequence columns |
| `google_connections` | ❌ |
| `email_senders` | ❌ |
| `email_preferences` | ❌ |
| `reminder_messages` | ❌ |
| `reminder_jobs` | ❌ |
| `agent_decisions` | ❌ |
| `sync_logs` | ❌ |

**Missing `invoices` columns:** `sequence_active`, `sequence_step`, `sequence_paused`, `sequence_approved`, `last_reminder_sent_at`, `dispute_flag`

**Missing `clients` columns:** `avg_days_to_pay`, `late_payment_rate`, `invoices_paid_on_time`, `invoices_paid_late`, `lifetime_value`, `tenure_months`, `communication_style`, `risk_level`, `preferred_channel`, `profile_updated_at`

### Backend modules: exists vs missing

**Exists:**

```
gentletap/api/auth.py, core.py, quickbooks.py, invoices.py, intelligence.py
gentletap/integrations/quickbooks/oauth.py, client.py, sync.py
gentletap/intelligence/engine.py, risk_scorer.py, message_generator.py, schemas.py
gentletap/services/auth.py, utils/crypto.py, utils/redis_client.py
gentletap/tasks/celery_app.py (ping only)
```

**Missing (from BUILD_PLAN):**

```
api/google.py, email.py, reminders.py, billing.py, escalations.py, notifications.py
api/webhooks/quickbooks.py, stripe.py, resend.py
integrations/google/oauth.py, gmail_sender.py
integrations/resend/sender.py
integrations/openai/client.py
integrations/stripe/billing.py
integrations/quickbooks/webhooks.py
intelligence/profiler.py, tone_selector.py, channel_selector.py,
  timing_optimizer.py, escalation.py, prompts/
services/reminders.py, sequences.py, billing.py, notifications.py
tasks/sync.py, reminders.py, tokens.py, profiling.py
.github/workflows/ci.yml
```

### Frontend audit

| UI | Wired to API | Fake / local only |
|----|--------------|-------------------|
| Landing `/` | `PreviewDemo` → demo intelligence | Sarah demo data |
| Login / Signup | Auth APIs | — |
| Onboarding persona | `POST /onboarding/persona` | Local step index |
| Onboarding QB | `GET /quickbooks/connect-url` | "Skip for now" bypass |
| Onboarding import | sync status + invoice summary | Polls every 2s |
| Onboarding email | **Nothing** | Buttons skip to preview |
| Onboarding preview | Demo intelligence endpoint | Not user's invoices |
| Approve & go live | **Nothing** | Redirect only |
| Dashboard | Auth gate only | Hardcoded zeros |

**Missing routes:** `/dashboard/invoices/[id]`, `/settings/connections`, `/settings/billing`

**Missing deps:** TanStack Query, shadcn/ui, PostHog, Sentry

### Tests

- **6 test functions** across `test_api.py` and `test_intelligence.py`
- No QB, email, billing, webhook, or Celery tests
- No CI (`.github/workflows/` missing)

### Dependencies

**Python — installed but unused:**

| Package | Used |
|---------|------|
| `openai` | ❌ |
| `pandas` | ❌ |
| `celery` | Barely (`ping` only) |
| `python-multipart` | ❌ |

**Need to add:** `google-api-python-client`, `stripe`, `resend`, `slowapi`, `svix`, `sentry-sdk`, optionally `twilio` (Pro WhatsApp)

### Technical debt

| Issue | Location | Impact |
|-------|----------|--------|
| BackgroundTasks instead of Celery | `api/quickbooks.py` | Sync lost on restart; no retry |
| Dev-only `create_all` | `main.py` | Migration drift in dev |
| Demo intelligence endpoint | `api/intelligence.py` | Not tied to user data |
| Template messages | `message_generator.py` | Product promise gap |
| No refresh tokens | `services/auth.py` | Sessions expire; config unused |
| No rate limiting | — | Auth/OAuth unprotected |
| Celery worker/beat not in compose | `docker-compose.yml` | No scheduled reminders |
| Stale docs | README, TODO | QB marked as TODO/stub |
| Onboarding step desync | Frontend local `step` vs `user.onboarding_step` | Progress lost on refresh |
| Free tier not enforced | `config.py` | `free_plan_active_invoice_limit` unused |

### Completion scorecard

| Area | % Complete |
|------|------------|
| Auth & profiles | ~75% |
| QuickBooks OAuth + initial sync | ~65% |
| Invoices API | ~15% |
| Intelligence engine | ~40% |
| Email (Gmail/Resend) | 0% |
| Reminders & sequences | 0% |
| Billing (Stripe) | 0% |
| Webhooks | 0% |
| Celery background jobs | ~5% |
| Frontend onboarding | ~50% |
| Frontend dashboard | ~10% |
| Database schema | ~35% |
| Tests | ~10% |
| Deploy/CI | ~40% |

---

## Part 2 — External services research

### 1. Intuit / QuickBooks

| Topic | Detail |
|-------|--------|
| **Signup** | [developer.intuit.com](https://developer.intuit.com) → Create app → QuickBooks Online |
| **Scope** | `com.intuit.quickbooks.accounting` (read-only MVP) — already in `oauth.py` |
| **Redirect URI** | `https://gentletap.co/v1/quickbooks/callback` (via Next.js proxy) |
| **Sandbox** | Immediate dev keys; `INTUIT_ENVIRONMENT=sandbox` |
| **Production gate** | **App Assessment Questionnaire** — required even for private apps; ~2 business days |
| **App Store** | Separate review; weeks–months; not required for direct users |
| **Pricing** | **Builder tier: $0/mo** — 500K CorePlus API credits/mo (reads metered since Nov 2025) |
| **Rate limits** | 500 req/min per realm, 10 concurrent |
| **Webhooks** | Header `intuit-signature` = HMAC-SHA256(raw body, verifier token); respond 200 quickly; process async |
| **Idempotency** | Use `intuit-t-id` header |
| **Deadline** | **CloudEvents payload mandatory by May 15, 2026** — plan parser update now |

**Gotchas:**

- Refresh token rotates on every exchange — code in `oauth.py` must always store the new one
- Refresh tokens expire after **100 days unused** (hard max 5 years)
- Access tokens expire in **1 hour**
- Read-only MVP still requires App Assessment for production
- Payment detection: webhook → fetch entity → `Balance == 0` → cancel Celery jobs

**Env vars:**

```
INTUIT_CLIENT_ID
INTUIT_CLIENT_SECRET
INTUIT_REDIRECT_URI
INTUIT_ENVIRONMENT=sandbox|production
INTUIT_WEBHOOK_VERIFIER_TOKEN   ← add to .env.example
```

**Docs:** [Publishing requirements](https://developer.intuit.com/app/developer/qbo/docs/go-live/publish-app/platform-requirements), [Webhooks](https://developer.intuit.com/app/developer/qbo/docs/develop/webhooks/configure-webhooks)

---

### 2. Google / Gmail

| Topic | Detail |
|-------|--------|
| **Scope** | `https://www.googleapis.com/auth/gmail.send` only — avoid `gmail.readonly` (triggers CASA Tier 2 audit) |
| **Redirect** | `https://gentletap.co/v1/google/callback` |
| **Testing mode** | Max **100 users**; refresh tokens expire in **7 days** — not viable for production sequences |
| **Verification** | **2–4 weeks**; needs privacy policy, demo video, scope justification |
| **Pricing** | Free (quota-based) |
| **Limits** | 500 sends/day (personal Gmail); 2,000/day (Google Workspace) |
| **Send method** | RFC 2822 → Base64url → `users.messages.send` |
| **Webhooks** | None for send-only — no Gmail webhooks needed for MVP |

**Gotchas:**

- **From address must match authenticated Google account**
- Testing mode 7-day refresh expiry breaks long-running sequences
- Unverified published app: hard cap **100 lifetime users** for sensitive scopes
- Max **100 refresh tokens** per Google account per OAuth client

**Docs:** [Gmail scopes](https://developers.google.com/workspace/gmail/api/auth/scopes), [Sensitive scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification)

---

### 3. Resend

| Topic | Detail |
|-------|--------|
| **Use case** | Users with **their own domain** OR transactional from `reminders@mail.gentletap.co` |
| **NOT for** | Sending as `@gmail.com` addresses |
| **Setup** | API key + verify domain (SPF/DKIM) |
| **Approval** | Immediate (DNS verification only) |
| **Pricing** | Free: 3K/mo, 100/day; **Pro $20/mo**: 50K/mo |
| **Rate limits** | 5 requests/second per team |
| **Webhooks** | Svix-signed (`svix-id`, `svix-timestamp`, `svix-signature`) |

**Dev sandbox:** `onboarding@resend.dev` — can only send to your Resend account email.

**Docs:** [Resend pricing](https://resend.com/pricing), [Verify webhooks](https://resend.com/docs/webhooks/verify-webhooks-requests)

---

### 4. OpenAI

| Topic | Detail |
|-------|--------|
| **Model** | `gpt-4o-mini` — $0.15/1M input, $0.60/1M output |
| **Est. cost** | ~$1–80/mo at 0–500 users |
| **Approval** | None — add payment method; spend $5 for Tier 1 limits |
| **Limits** | Tier 1: 500 RPM, 200K TPM for mini |
| **Pattern** | Celery task → structured JSON `{subject, body}` → banned phrase check → regenerate once |

**Docs:** [OpenAI pricing](https://developers.openai.com/api/docs/pricing)

---

### 5. Stripe (GentleTap Pro $19/mo)

| Topic | Detail |
|-------|--------|
| **Net per sub** | ~$18.07 after ~2.9% + $0.30 + 0.7% Billing fee |
| **Test mode** | Immediate; use `stripe listen --forward-to localhost:8000/v1/webhooks/stripe` |
| **Live mode** | Business verification ~1–3 days |
| **Webhooks** | `Stripe-Signature` on **raw body** — never re-parse JSON before verify |
| **Critical events** | `checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.paid`, `invoice.payment_failed` |
| **Free tier** | Enforce in **API** (5 active sequences), not in Stripe |

**Docs:** [Stripe webhooks](https://docs.stripe.com/webhooks), [SaaS subscriptions](https://docs.stripe.com/get-started/use-cases/saas-subscriptions)

---

### 6. Twilio WhatsApp (Pro tier — post-core)

| Topic | Detail |
|-------|--------|
| **Timeline** | Meta business verification + template approval: days to weeks |
| **Templates** | Required outside 24h session window — design utility template early |
| **Pricing** | ~$0.005/msg Twilio + Meta per-message fees |
| **Webhook** | `X-Twilio-Signature` HMAC-SHA1 |
| **Recommendation** | Ship email-only first; add WhatsApp as Pro differentiator |

Per BUILD_PLAN, WhatsApp is v1.1+ but product brief includes it on Pro ($19/mo).

**Docs:** [Twilio WhatsApp templates](https://www.twilio.com/docs/whatsapp/tutorial/send-whatsapp-notification-messages-templates)

---

## Part 3 — Infrastructure

### Current Docker stack gaps

`docker-compose.yml` has Postgres, Redis, API, Web. **Missing:**

```yaml
worker:
  build: ./apps/api
  command: celery -A gentletap.tasks worker -l info --concurrency=2
  env_file: .env
  depends_on:
    redis: { condition: service_healthy }
    postgres: { condition: service_healthy }
  restart: unless-stopped

beat:
  build: ./apps/api
  command: celery -A gentletap.tasks beat -l info
  env_file: .env
  depends_on: [redis]
  restart: unless-stopped
  # NEVER scale beat > 1 replica
```

### Celery production settings

| Setting | Value | Why |
|---------|-------|-----|
| `task_acks_late=True` | ✓ | Don't lose tasks on worker crash |
| `worker_prefetch_multiplier=1` | ✓ | Fair dispatch for long QB syncs |
| `broker_transport_options.visibility_timeout` | ≥43200 | Prevent duplicate syncs |
| `result_expires=3600` | ✓ | Redis memory |
| `worker_max_tasks_per_child=1000` | ✓ | Mitigate memory leaks |
| `broker_connection_retry_on_startup=True` | ✓ | Survive Redis startup race |

### Redis on VPS

```yaml
redis:
  command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
  volumes: [redis_data:/data]
```

- Do **not** expose Redis port 6379 publicly in production
- Broker DB 0, results DB 1 (already in config)

### Scheduled Celery tasks (required)

| Task | Schedule | Purpose |
|------|----------|---------|
| `refresh_qb_tokens` | Daily 03:00 UTC | Prevent QB disconnects |
| `refresh_google_tokens` | Daily 03:30 UTC | Prevent Gmail failures |
| `sync_qb_cdc` | Every 30 min | Backup if webhooks miss |
| `evaluate_reminders` | Hourly | Find due steps → decide → queue send |
| `reprofile_clients` | After each user sync | Update client stats |
| `reconcile_payments` | Every 15 min | Balance check vs QB |
| `cleanup_stale_jobs` | Daily | Cancel jobs for paid invoices |

### nginx / Next.js proxy (already correct)

```
Browser (HTTPS) → nginx:443 → Next.js:3000 → http://api:8000/v1/*
```

**Rules:**

| Do | Don't |
|----|-------|
| Set `API_PROXY_URL=http://api:8000` in Docker web service | Set `API_PROXY_URL=https://gentletap.co` |
| Proxy **all paths** including `/v1/*` to port **3000** | Route `/v1` directly to port 8000 in nginx |
| Set `X-Forwarded-Proto: https` in nginx | Let API generate `http://` redirect URIs |
| OAuth callbacks at `https://gentletap.co/v1/...` | Expose API :8000 publicly |

Implementation: `apps/web/src/app/v1/[...path]/route.ts`, `deploy/nginx.conf.example`

External webhooks (Stripe, Intuit) also arrive at `https://gentletap.co/v1/webhooks/*` → proxied to FastAPI.

### JWT gap and recommended pattern

**Current:** Access token only (60 min), stored in `localStorage`. `REFRESH_TOKEN_EXPIRE_DAYS=30` in config but no `/auth/refresh`.

**Production pattern:**

| Token | TTL | Storage |
|-------|-----|---------|
| Access JWT | 15–60 min | Client memory / localStorage |
| Refresh token | 7–30 days | HttpOnly Secure cookie OR hashed in DB |

**Implementation checklist:**

1. `refresh_tokens` table: `id`, `user_id`, `token_hash`, `family_id`, `used`, `expires_at`
2. `POST /auth/refresh` — validate hash, rotate, issue new pair
3. Reuse detection: if used token presented → revoke entire family
4. `POST /auth/logout` — revoke refresh family

---

## Part 4 — Legal & compliance

| Item | Status | Required by |
|------|--------|-------------|
| Privacy policy (public URL) | ❌ | Google OAuth, Intuit assessment |
| Terms of service | ❌ | Google OAuth |
| Data retention policy | ❌ | Intuit assessment |
| OAuth scope justification | ❌ | Google verification |
| Demo video (OAuth + send flow) | ❌ | Google verification |
| Disconnect/revoke flows | ⚠️ QB yes; Google no | Intuit + Google |
| Account deletion / GDPR | ❌ | Best practice |

---

## Part 5 — Cost model

| Service | 0–20 users | 50–200 users | ~500 users |
|---------|------------|--------------|------------|
| VPS (Hetzner/DO) | $5–12 | $12–24 | $24–48 |
| Intuit API | $0 | $0 | $0 (monitor CorePlus reads) |
| Google Gmail | $0 | $0 | $0 |
| Resend | $0 | $0–20 | $20 |
| OpenAI | $1–5 | $5–20 | $20–80 |
| Stripe fees | minimal | ~$50–100 | ~$490 (if all paying) |
| Sentry | $0 | $0–26 | $26 |
| **Total infra** | **~$30–80/mo** | **~$100–250/mo** | **~$400–800/mo** |

At 500 paying users × $19 = **$9,500 MRR** → infra ~5–8% of revenue.

---

## Part 6 — Environment variables (complete)

### Required for production

| Variable | Source |
|----------|--------|
| `ENVIRONMENT=production` | Set explicitly |
| `DATABASE_URL` | VPS / managed Postgres |
| `REDIS_URL`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND` | Redis |
| `JWT_SECRET_KEY`, `SECRET_KEY`, `TOKEN_ENCRYPTION_KEY` | Generated — never use dev defaults |
| `API_URL`, `WEB_URL`, `CORS_ORIGINS` | `https://gentletap.co` |
| `INTUIT_CLIENT_ID`, `INTUIT_CLIENT_SECRET`, `INTUIT_REDIRECT_URI` | Intuit Developer Portal |
| `INTUIT_ENVIRONMENT=production` | After assessment approved |
| `INTUIT_WEBHOOK_VERIFIER_TOKEN` | Intuit → Webhooks |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | Google Cloud Console |
| `RESEND_API_KEY` | Resend Dashboard |
| `OPENAI_API_KEY` | OpenAI Platform |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PRO` | Stripe Live |
| `API_PROXY_URL=http://api:8000` | Docker web service only — internal |

### Optional / v1.1

```
RESEND_WEBHOOK_SECRET=
SENTRY_DSN=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=
```

### Generate secrets

```bash
openssl rand -hex 32          # SECRET_KEY, JWT_SECRET_KEY
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"  # TOKEN_ENCRYPTION_KEY
```

---

## Part 7 — Founder credential checklist

### Phase 0 — Today (no approvals)

- [ ] Intuit **sandbox** Client ID + Secret
- [ ] OpenAI API key + $5 billing for Tier 1
- [ ] Stripe **test** keys + $19/mo Price + webhook via CLI
- [ ] Resend API key (dev sends to yourself via `onboarding@resend.dev`)
- [ ] Generate production secrets (see above)
- [ ] Publish Privacy Policy + Terms at public URLs

### Phase 1 — Integration testing (Week 2–4)

- [ ] Intuit sandbox company connected; verify invoice sync
- [ ] Register QB webhook URL + save Verifier Token
- [ ] Google Cloud → Gmail API → OAuth client (Testing mode, add test users)
- [ ] Resend domain DNS (if using Resend path)
- [ ] Stripe test webhooks: `stripe listen --forward-to localhost:8000/v1/webhooks/stripe`

### Phase 2 — Production gates (start early, parallel with build)

- [ ] **Intuit App Assessment Questionnaire** → production keys (~2 days)
- [ ] **Google OAuth verification** → publish app (2–4 weeks)
- [ ] **Stripe Live** → business verification (~1–3 days)
- [ ] Update all redirect URIs to `https://gentletap.co/v1/...`

### Phase 3 — Launch

- [ ] Flip `INTUIT_ENVIRONMENT=production`
- [ ] Stripe live keys + live webhook endpoint
- [ ] Google app published (not Testing mode)
- [ ] Sentry DSN configured
- [ ] Redis not exposed publicly
- [ ] Celery worker + beat running

---

## Part 8 — Critical path timeline

```
Week 1–2   Data layer: migrations, invoice list API, live dashboard
Week 3     Sync reliability: QB webhooks, CDC, payment detection, Celery worker
Week 4–5   Email: Gmail OAuth + send, Resend verify path
Week 6     AI: OpenAI generator, real /reminders/preview, delete demo endpoint
Week 7–8   Sequences: jobs table, beat, approve-all, send pipeline
Week 9     Billing: Stripe checkout, webhooks, 5-invoice gate
Week 10    Escalation + polish: red queue, notifications, edge cases
Week 11–12 WhatsApp Pro (Twilio) + hardening + beta

Parallel (start Week 1):
  → Intuit App Assessment submit
  → Google OAuth verification submit (long pole: 2–4 weeks)
  → Privacy Policy + Terms published
```

---

## Part 9 — Build order (research-backed)

| Phase | Duration | Deliverable | Exit test |
|-------|----------|-------------|-----------|
| **1. Data layer** | 1 week | Migrations 003–005, invoice list API, wire dashboard | Real QB invoices on dashboard |
| **2. Sync reliability** | 1 week | QB webhooks, CDC, payment detection, Celery worker | Pay in QB → sequence stops |
| **3. Email** | 2 weeks | Gmail OAuth + send, Resend verify path | Test email from user's Gmail |
| **4. AI messages** | 1 week | OpenAI generator, `/reminders/preview`, remove demo endpoint | Drafts for user's real invoices |
| **5. Sequences** | 2 weeks | Jobs table, beat schedule, approve-all, send pipeline | Day 0 email sends after approve |
| **6. Billing** | 1 week | Stripe checkout, webhooks, 5-invoice gate | 6th invoice blocked on free |
| **7. Escalation + polish** | 1 week | Red queue, notifications, Sentry | 21-day invoice escalates with recommendation |
| **8. WhatsApp Pro** | 2 weeks | Twilio + templates | Pro user gets WA on step 1 |
| **9. Hardening** | 1 week | CI, tests, legal pages, load test | Beta user recovers a payment |

**Total: ~12 weeks** to full product including WhatsApp Pro.

---

## Part 10 — Decommission list (MVP → production)

| Remove or dev-gate | Replace with |
|--------------------|--------------|
| `POST /v1/intelligence/preview` (Sarah demo) | `GET /reminders/preview` (auth, real invoices) |
| Template messages in `message_generator.py` | OpenAI + guardrails |
| "Skip for now" on QB onboarding | Block progression |
| Email buttons that skip to preview | Real Gmail/Resend OAuth |
| `finish()` → dashboard only | `POST /reminders/approve-all` |
| Dashboard hardcoded zeros | Live `/invoices` + `/invoices/summary` |
| BackgroundTasks for QB sync | Celery tasks |
| `Base.metadata.create_all()` in prod | Alembic only |

---

## Part 11 — Top 10 launch risks

| # | Risk | Mitigation |
|---|------|------------|
| 1 | Google 7-day refresh in Testing mode | Submit verification before beta >10 users |
| 2 | Resend can't send as Gmail | Use Gmail OAuth for personal inbox users |
| 3 | Intuit refresh token not saved on exchange | Already handled in `oauth.py` — don't regress |
| 4 | nginx routes `/v1` to :8000 | Proxy everything to :3000 |
| 5 | Intuit CloudEvents May 2026 deadline | Build new webhook parser before payment webhooks in prod |
| 6 | Sync in BackgroundTasks | Move to Celery before production |
| 7 | Demo preview in prod | Delete or gate `POST /intelligence/preview` |
| 8 | No payment stop | QB webhooks + reconcile cron before first live send |
| 9 | Free tier not enforced | Gate at `approve-all` and `evaluate_reminders` |
| 10 | Stale README/TODO | Update after each phase |

---

## Part 12 — Files to create (inventory)

### Backend — new (~25 files)

```
apps/api/gentletap/api/google.py
apps/api/gentletap/api/email.py
apps/api/gentletap/api/reminders.py
apps/api/gentletap/api/billing.py
apps/api/gentletap/api/escalations.py
apps/api/gentletap/api/notifications.py
apps/api/gentletap/api/webhooks/quickbooks.py
apps/api/gentletap/api/webhooks/stripe.py
apps/api/gentletap/api/webhooks/resend.py
apps/api/gentletap/integrations/google/oauth.py
apps/api/gentletap/integrations/google/gmail_sender.py
apps/api/gentletap/integrations/resend/sender.py
apps/api/gentletap/integrations/openai/client.py
apps/api/gentletap/integrations/stripe/billing.py
apps/api/gentletap/integrations/quickbooks/webhooks.py
apps/api/gentletap/intelligence/profiler.py
apps/api/gentletap/intelligence/tone_selector.py
apps/api/gentletap/intelligence/channel_selector.py
apps/api/gentletap/intelligence/timing_optimizer.py
apps/api/gentletap/intelligence/escalation.py
apps/api/gentletap/intelligence/prompts/system.md
apps/api/gentletap/intelligence/prompts/user.md
apps/api/gentletap/services/reminders.py
apps/api/gentletap/services/sequences.py
apps/api/gentletap/services/billing.py
apps/api/gentletap/services/notifications.py
apps/api/gentletap/tasks/sync.py
apps/api/gentletap/tasks/reminders.py
apps/api/gentletap/tasks/tokens.py
apps/api/gentletap/tasks/profiling.py
apps/api/alembic/versions/003_email.py
apps/api/alembic/versions/004_sequence_fields.py
apps/api/alembic/versions/005_reminders.py
.github/workflows/ci.yml
```

### Backend — modify (~12 files)

```
apps/api/gentletap/database.py
apps/api/gentletap/main.py
apps/api/gentletap/api/invoices.py
apps/api/gentletap/api/intelligence.py (delete preview or dev-gate)
apps/api/gentletap/intelligence/message_generator.py
apps/api/gentletap/intelligence/engine.py
apps/api/gentletap/api/quickbooks.py
apps/api/gentletap/api/auth.py
apps/api/gentletap/services/auth.py
apps/api/gentletap/config.py
apps/api/gentletap/tasks/celery_app.py
docker-compose.yml
.env.example
```

### Frontend — modify/create (~8 files)

```
apps/web/src/app/dashboard/page.tsx
apps/web/src/app/onboarding/page.tsx
apps/web/src/lib/api.ts
apps/web/src/app/dashboard/invoices/[id]/page.tsx
apps/web/src/app/settings/connections/page.tsx
apps/web/src/app/settings/billing/page.tsx
apps/web/src/components/preview-demo.tsx (replace or remove demo path)
```

---

## Part 13 — Production definition

Production is reached when **all** are true:

1. User connects real QuickBooks → unpaid invoices in dashboard within 2 min
2. User connects real Gmail or verified email → reminders send from their address
3. User previews **their** overdue invoices → edits → approves batch
4. Celery runs 5-step sequence (Day 0/3/7/14/21) with OpenAI copy
5. QB payment → balance 0 → all pending jobs cancelled instantly
6. Dashboard shows live green/yellow/red with pause/resume/escalate
7. Free tier enforced at 5 active sequences; Stripe Pro unlocks unlimited + WhatsApp
8. Pro: WhatsApp when client phone exists
9. Escalation alerts with recommendations at Day 21+
10. No hardcoded demo data in production code paths
11. Monitoring, backups, legal pages, OAuth apps in production mode

---

## Part 14 — Testing requirements (production bar)

| Layer | Required |
|-------|----------|
| Intelligence | 20+ unit tests: tone, escalation, wait conditions, billing gate |
| Integrations | VCR/cassette tests for QB, Gmail, Stripe webhooks |
| API | Integration tests for onboarding → approve-all flow |
| E2E | Playwright: signup → QB sandbox → Gmail → approve → job scheduled |
| Manual QA | 3 sandbox companies with different client profiles |

**Critical scenarios:**

1. Reliable client, 5 days overdue → warm email, no escalate
2. Repeat late payer, 18 days → firm tone
3. Payment in QB → jobs cancelled within 1 min
4. Free user, 6th approve → 402 + Stripe URL
5. Google token revoked → dashboard shows reconnect
6. No approve → zero sends
7. Client no email → invoice red, no send attempt
8. Pro user with phone → WhatsApp on step 1

---

## Summary

GentleTap has a **solid foundation** (~15–20% of full product): auth, QB OAuth/sync, intelligence rules, deploy stack, brand UI. The **remaining ~85%** is the actual product — database extensions, Celery automation, Gmail send, OpenAI copy, reminder sequences, payment webhooks, live dashboard, and Stripe.

**Start in parallel this week:**

1. **Build** — Phase 1 (migrations + invoice list + live dashboard)
2. **Approvals** — Submit Google OAuth verification + Intuit App Assessment
3. **Legal** — Publish Privacy Policy + Terms

**Build order:** QB sync (real data) → profiling → OpenAI messages → email send → sequences → payment stop → billing → WhatsApp Pro.

---

*Document owner: GentleTap founder. Update as research and implementation progress.*
