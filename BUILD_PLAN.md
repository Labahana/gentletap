# GentleTap — Python-First AI-Native Build Plan

**Version:** 1.0  
**Date:** June 2026  
**Target:** Solo founder MVP in 8–10 weeks  
**Stack thesis:** Python owns intelligence, integrations, and async work; Next.js owns UX only.

---

## Executive summary

GentleTap is an AI-native payment collection agent for freelancers. Clients connect **QuickBooks**, connect **email** (Gmail OAuth or verified sender via Resend), preview AI-drafted reminders on real overdue invoices, then run autonomous follow-up sequences until payment is detected.

This plan centers **Python (FastAPI)** as the core runtime for:

- AI agent decision-making and message generation
- Client relationship profiling and risk scoring
- QuickBooks sync, webhooks, and payment detection
- Email orchestration (Gmail API + Resend)
- Background jobs and scheduled sequences

**Next.js** is the frontend shell: marketing site, onboarding UI, dashboard. It does not contain business logic.

---

## Architecture overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USERS (Browser)                                  │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │   Next.js 15 (Vercel)     │
                    │   • Marketing / Landing    │
                    │   • Onboarding UI          │
                    │   • Dashboard UI           │
                    │   • No business logic      │
                    └─────────────┬─────────────┘
                                  │ REST / tRPC optional
                    ┌─────────────▼─────────────┐
                    │   FastAPI (Railway/Fly)    │
                    │   • Auth JWT validation    │
                    │   • OAuth callbacks        │
                    │   • Webhooks               │
                    │   • Intelligence engine    │
                    │   • Integration layer      │
                    └──────┬──────────┬─────────┘
                           │          │
              ┌────────────▼──┐   ┌───▼────────────┐
              │  PostgreSQL   │   │  Redis         │
              │  (Supabase)   │   │  (Upstash)     │
              └───────────────┘   └───┬────────────┘
                                      │
                              ┌───────▼────────┐
                              │  Celery workers │
                              │  • Sync QB       │
                              │  • Send reminders│
                              │  • Profile clients│
                              │  • Token refresh │
                              └────────────────┘

External: QuickBooks API · Gmail API · Resend · OpenAI · Stripe · Inngest (optional)
```

### Design principles

1. **AI-native:** Every reminder passes through `IntelligenceEngine.decide()` before send.
2. **Python owns data + logic:** Next.js calls API; never talks to QuickBooks or Gmail directly.
3. **Event-driven sync:** QuickBooks webhooks + CDC backup; payment stops sequences instantly.
4. **Human-in-the-loop first run:** Stage 6 approval; autonomous after first batch.
5. **Extractable intelligence:** All AI/profiling in `gentletap/intelligence/` — testable in isolation.

---

## Tech stack

### Backend (Python)

| Component | Choice | Version | Purpose |
|-----------|--------|---------|---------|
| Framework | **FastAPI** | 0.115+ | API, OAuth callbacks, webhooks |
| Runtime | **Python** | 3.12+ | |
| ASGI server | **Uvicorn** | | Production via Gunicorn+Uvicorn workers |
| ORM | **SQLAlchemy 2.0** | | Models, queries |
| Migrations | **Alembic** | | Schema versioning |
| Validation | **Pydantic v2** | | Request/response + agent schemas |
| Task queue | **Celery** | 5.x | Async jobs |
| Broker | **Redis** (Upstash) | | Celery broker + result backend |
| HTTP client | **httpx** | | Async external API calls |
| QB OAuth | **intuit-oauth** | | Official Intuit OAuth |
| Google | **google-api-python-client** | | Gmail send |
| AI / LLM | **OpenAI Python SDK** | | Message generation |
| Agent framework | **LangGraph** (optional v1.1) | | Multi-step agent loops |
| ML / profiling | **pandas**, **scikit-learn** | | Client scoring, prediction (v1.1+) |
| Encryption | **cryptography** (Fernet) | | Token encryption at rest |
| Testing | **pytest**, **pytest-asyncio** | | |
| Linting | **ruff**, **mypy** | | |

### Frontend

| Component | Choice | Purpose |
|-----------|--------|---------|
| Framework | **Next.js 15** (App Router) | UI only |
| Language | **TypeScript** | |
| Styling | **Tailwind CSS** + **shadcn/ui** | Warm, minimal brand |
| API client | **TanStack Query** | Cache + polling dashboard |
| Auth client | Supabase Auth JS or custom JWT | |

### Infrastructure

| Component | Choice | Purpose |
|-----------|--------|---------|
| Database | **Supabase PostgreSQL** | Primary data store |
| Auth | **Supabase Auth** or **FastAPI-users** | User accounts; JWT to API |
| Backend host | **Railway** or **Fly.io** | FastAPI + Celery workers |
| Frontend host | **Vercel** | Next.js |
| Redis | **Upstash** | Celery + rate limit cache |
| Secrets | Platform env vars | |
| Monitoring | **Sentry** (Python + Next) | |
| Analytics | **PostHog** | Onboarding funnel |
| CI | **GitHub Actions** | Test + deploy |

### External services

| Service | Purpose |
|---------|---------|
| Intuit Developer | QuickBooks OAuth + webhooks |
| Google Cloud | Gmail OAuth (`gmail.send`) |
| Resend | Non-Gmail send + transactional email |
| OpenAI | `gpt-4o-mini` reminder generation |
| Stripe | $19/mo Pro subscription |

---

## Repository structure

Monorepo recommended:

```
gentletap/
├── README.md
├── BUILD_PLAN.md                 # This file
├── docker-compose.yml            # Local: postgres, redis, api, worker
├── .github/workflows/ci.yml
│
├── apps/
│   ├── web/                      # Next.js frontend
│   │   ├── app/
│   │   │   ├── (marketing)/
│   │   │   ├── (auth)/
│   │   │   ├── (onboarding)/
│   │   │   └── (dashboard)/
│   │   ├── components/
│   │   ├── lib/api-client.ts     # Typed fetch wrapper → FastAPI
│   │   └── package.json
│   │
│   └── api/                      # Python FastAPI backend
│       ├── pyproject.toml        # uv or poetry
│       ├── alembic/
│       ├── gentletap/
│       │   ├── main.py
│       │   ├── config.py
│       │   ├── dependencies.py
│       │   │
│       │   ├── api/              # Route handlers
│       │   │   ├── auth.py
│       │   │   ├── onboarding.py
│       │   │   ├── quickbooks.py
│       │   │   ├── google.py
│       │   │   ├── email.py
│       │   │   ├── invoices.py
│       │   │   ├── reminders.py
│       │   │   ├── webhooks/
│       │   │   │   ├── quickbooks.py
│       │   │   │   └── stripe.py
│       │   │   └── billing.py
│       │   │
│       │   ├── intelligence/     # ★ AI-native core
│       │   │   ├── engine.py           # Main decide() orchestrator
│       │   │   ├── profiler.py         # Client relationship profiles
│       │   │   ├── risk_scorer.py      # Low / medium / high risk
│       │   │   ├── tone_selector.py    # Warm → firm progression
│       │   │   ├── channel_selector.py # Email now; WhatsApp v1.1
│       │   │   ├── timing_optimizer.py # Send window selection
│       │   │   ├── message_generator.py# OpenAI integration
│       │   │   ├── escalation.py       # Human handoff rules
│       │   │   ├── prompts/            # System + user prompt templates
│       │   │   └── schemas.py          # Pydantic models for agent I/O
│       │   │
│       │   ├── integrations/
│       │   │   ├── quickbooks/
│       │   │   │   ├── oauth.py
│       │   │   │   ├── client.py         # API wrapper
│       │   │   │   ├── sync.py           # Initial + CDC sync
│       │   │   │   └── webhooks.py
│       │   │   ├── google/
│       │   │   │   ├── oauth.py
│       │   │   │   └── gmail_sender.py
│       │   │   ├── resend/
│       │   │   │   └── sender.py
│       │   │   ├── openai/
│       │   │   │   └── client.py
│       │   │   └── stripe/
│       │   │       └── billing.py
│       │   │
│       │   ├── models/           # SQLAlchemy models
│       │   ├── schemas/          # Pydantic API schemas
│       │   ├── services/         # Business logic glue
│       │   ├── tasks/            # Celery tasks
│       │   │   ├── sync.py
│       │   │   ├── reminders.py
│       │   │   ├── tokens.py
│       │   │   └── profiling.py
│       │   └── utils/
│       │       ├── crypto.py
│       │       └── dates.py
│       │
│       └── tests/
│           ├── intelligence/
│           ├── integrations/
│           └── api/
│
└── packages/
    └── shared/                   # Optional: shared types (openapi-generated)
```

---

## Database schema

PostgreSQL via SQLAlchemy. All tables include `user_id` for tenant isolation.

```sql
-- Users (extends Supabase auth.users or standalone)
profiles (
  id UUID PK,
  email TEXT NOT NULL,
  full_name TEXT,
  persona TEXT,                    -- freelancer | consultant | agency
  plan TEXT DEFAULT 'free',        -- free | pro
  stripe_customer_id TEXT,
  onboarding_step TEXT,            -- account | qb | import | email | preview | live
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)

quickbooks_connections (
  id UUID PK,
  user_id UUID FK,
  realm_id TEXT NOT NULL,
  access_token_enc TEXT NOT NULL,
  refresh_token_enc TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  UNIQUE(user_id)
)

google_connections (
  id UUID PK,
  user_id UUID FK,
  google_email TEXT NOT NULL,
  access_token_enc TEXT NOT NULL,
  refresh_token_enc TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ,
  UNIQUE(user_id)
)

email_senders (
  id UUID PK,
  user_id UUID FK,
  email_address TEXT NOT NULL,
  provider TEXT DEFAULT 'resend',  -- resend
  verification_status TEXT,        -- pending | verified | failed
  verified_at TIMESTAMPTZ,
  is_primary BOOLEAN DEFAULT false
)

email_preferences (
  user_id UUID PK FK,
  send_provider TEXT NOT NULL,     -- google | resend
  require_approval BOOLEAN DEFAULT true,  -- false after first batch
  first_batch_approved_at TIMESTAMPTZ
)

clients (
  id UUID PK,
  user_id UUID FK,
  qb_customer_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  -- Intelligence profile (updated by profiler.py)
  avg_days_to_pay NUMERIC,
  late_payment_rate NUMERIC,       -- 0.0 - 1.0
  invoices_paid_on_time INT DEFAULT 0,
  invoices_paid_late INT DEFAULT 0,
  lifetime_value NUMERIC DEFAULT 0,
  tenure_months INT,
  communication_style TEXT,        -- formal | casual | unknown
  risk_level TEXT DEFAULT 'medium',  -- low | medium | high
  preferred_channel TEXT DEFAULT 'email',
  profile_updated_at TIMESTAMPTZ,
  UNIQUE(user_id, qb_customer_id)
)

invoices (
  id UUID PK,
  user_id UUID FK,
  client_id UUID FK,
  qb_invoice_id TEXT NOT NULL,
  doc_number TEXT,
  amount NUMERIC NOT NULL,
  balance NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  invoice_date DATE,
  due_date DATE,
  days_overdue INT DEFAULT 0,
  status TEXT NOT NULL,            -- green | yellow | red | paid
  sequence_active BOOLEAN DEFAULT false,
  sequence_step INT DEFAULT 0,
  sequence_paused BOOLEAN DEFAULT false,
  sequence_approved BOOLEAN DEFAULT false,
  last_reminder_sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  qb_last_updated TIMESTAMPTZ,
  UNIQUE(user_id, qb_invoice_id)
)

reminder_messages (
  id UUID PK,
  invoice_id UUID FK,
  sequence_step INT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  tone TEXT,
  channel TEXT DEFAULT 'email',
  send_provider TEXT,              -- google | resend
  status TEXT,                     -- draft | pending_approval | approved | sent | failed
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  external_message_id TEXT,
  created_at TIMESTAMPTZ
)

reminder_jobs (
  id UUID PK,
  invoice_id UUID FK,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sequence_step INT NOT NULL,
  status TEXT DEFAULT 'pending',   -- pending | sent | cancelled | failed
  celery_task_id TEXT,
  UNIQUE(invoice_id, sequence_step)
)

agent_decisions (
  id UUID PK,
  invoice_id UUID FK,
  decision JSONB NOT NULL,         -- full DecideResult snapshot
  created_at TIMESTAMPTZ
)

sync_logs (
  id UUID PK,
  user_id UUID FK,
  sync_type TEXT,
  status TEXT,
  details JSONB,
  created_at TIMESTAMPTZ
)
```

---

## Intelligence engine (Python core)

All reminder logic flows through one entry point:

```python
# gentletap/intelligence/engine.py

class IntelligenceEngine:
    def decide(self, ctx: ReminderContext) -> DecideResult:
        """
        Runs the GentleTap decision framework before every action.
        """
        if not self._should_send(ctx):
            return DecideResult(action="wait", reason=ctx.block_reason)

        profile = self.profiler.get_or_build(ctx.client_id)
        risk = self.risk_scorer.score(ctx, profile)
        tone = self.tone_selector.select(ctx, profile, risk)
        channel = self.channel_selector.select(ctx, profile)  # email only MVP
        send_at = self.timing_optimizer.next_window(ctx, profile)

        if self.escalation.needs_human(ctx, profile, risk):
            return DecideResult(action="escalate", tone=tone, ...)

        message = self.message_generator.generate(ctx, profile, tone)

        return DecideResult(
            action="send",
            channel=channel,
            tone=tone,
            send_at=send_at,
            message=message,
        )
```

### Decision framework (from product brief)

**Should I send?**

| Condition | Action |
|-----------|--------|
| Invoice not overdue | Wait |
| Client responded recently | Wait |
| Open dispute flag | Hold |
| Sequence paused | Skip |
| Not approved (first batch) | Queue as draft |
| Free plan over 5 invoice limit | Block + upgrade prompt |

**Tone selection (`tone_selector.py`)**

| Signal | Effect |
|--------|--------|
| Days overdue ↑ | Firmer |
| `late_payment_rate` high | Firmer |
| Tenure long + low late rate | Warmer |
| Amount > $10,000 | More careful |
| Sequence step 0–1 | Warm |
| Sequence step 3+ | Firm |

**Risk scoring (`risk_scorer.py`) — MVP rules, v1.1 ML**

```python
# MVP: weighted rules
score = (
    0.4 * late_payment_rate +
    0.3 * min(days_overdue / 30, 1.0) +
    0.2 * (1 if no_response_21d else 0) +
    0.1 * (1 if amount > 10000 else 0)
)
# low < 0.3, medium < 0.6, high >= 0.6
```

**v1.1:** Train `sklearn.GradientBoostingClassifier` on `agent_decisions` + payment outcomes.

**Message generation (`message_generator.py`)**

- Model: `gpt-4o-mini`
- Input: Pydantic `MessageContext` (client, invoice, profile, step, prior messages)
- Output: `{ subject, body }`
- Guardrails: post-check for banned words ("collections", "demand", "overdue notice")
- All drafts stored before send

### Profiling (`profiler.py`)

Runs after every QuickBooks sync:

```python
def build_profile(client_id: str) -> ClientProfile:
    invoices = repo.get_paid_invoices(client_id)
    df = pd.DataFrame(invoices)
    return ClientProfile(
        avg_days_to_pay=df["days_to_pay"].mean(),
        late_payment_rate=(df["days_to_pay"] > 0).mean(),
        lifetime_value=df["amount"].sum(),
        tenure_months=months_since(df["invoice_date"].min()),
        ...
    )
```

---

## API design (FastAPI)

Base URL: `https://api.gentletap.co/v1`

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | JWT access + refresh |
| GET | `/auth/me` | Current user + onboarding state |

### Onboarding

| Method | Path | Description |
|--------|------|-------------|
| GET | `/onboarding/status` | Current step + completion |
| POST | `/onboarding/persona` | Set freelancer/consultant/agency |

### QuickBooks

| Method | Path | Description |
|--------|------|-------------|
| GET | `/quickbooks/connect` | Redirect to Intuit OAuth |
| GET | `/quickbooks/callback` | OAuth callback, store tokens |
| POST | `/quickbooks/disconnect` | Revoke + cleanup |
| POST | `/quickbooks/sync` | Trigger manual sync |
| GET | `/quickbooks/sync/status` | Import progress |

### Google / Email

| Method | Path | Description |
|--------|------|-------------|
| GET | `/google/connect` | Gmail OAuth redirect |
| GET | `/google/callback` | Store tokens |
| POST | `/email/sender/verify` | Start Resend sender verify |
| GET | `/email/sender/status` | Verification status |
| PUT | `/email/preferences` | Set provider: google \| resend |

### Invoices & dashboard

| Method | Path | Description |
|--------|------|-------------|
| GET | `/invoices` | List with status filter |
| GET | `/invoices/summary` | Total outstanding, counts by status |
| GET | `/invoices/{id}` | Detail + reminder history |
| POST | `/invoices/{id}/pause` | Pause sequence |
| POST | `/invoices/{id}/resume` | Resume sequence |

### Reminders (Stage 6 preview)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/reminders/preview` | Top 3 + all drafts for approval |
| PUT | `/reminders/{id}` | Edit draft message |
| POST | `/reminders/approve-all` | Approve first batch → activate |
| POST | `/reminders/send-now/{invoice_id}` | Optional: send first immediately |

### Billing

| Method | Path | Description |
|--------|------|-------------|
| POST | `/billing/checkout` | Stripe Checkout session |
| GET | `/billing/portal` | Stripe Customer Portal URL |
| POST | `/webhooks/stripe` | Subscription events |

### Webhooks (no auth — signature verified)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/webhooks/quickbooks` | Invoice/Payment events |
| POST | `/webhooks/resend` | Bounce/open events (optional) |

---

## Onboarding implementation (8 stages)

| Stage | Frontend route | Backend trigger |
|-------|----------------|-----------------|
| 1 Discovery | `/` | — |
| 2 Account | `/signup` | `POST /auth/register` |
| 3 QuickBooks | `/onboarding/quickbooks` | OAuth → sync task |
| 4 Import | `/onboarding/import` | Poll `GET /quickbooks/sync/status` |
| 5 Email | `/onboarding/email` | Google OAuth or Resend verify |
| 6 Preview | `/onboarding/preview` | `GET /reminders/preview` → approve |
| 7 Live | `/dashboard` | Sequences activated |
| 8 Result | `/dashboard` + toast | Webhook payment → notification |

**Import screen data:**

```json
GET /invoices/summary
{
  "unpaid_count": 23,
  "total_outstanding": 47200.00,
  "overdue_count": 15,
  "currency": "USD"
}
```

**6-minute path:** QuickBooks → import → Gmail OAuth → preview top 3 → approve all.

---

## Background jobs (Celery)

| Task | Schedule | Description |
|------|----------|-------------|
| `refresh_qb_tokens` | Daily 03:00 UTC | Proactive refresh all QB connections |
| `refresh_google_tokens` | Daily 03:30 UTC | Proactive refresh all Google connections |
| `sync_qb_cdc` | Every 30 min | CDC backup for all connected users |
| `evaluate_reminders` | Hourly | Find due steps → run IntelligenceEngine |
| `send_approved_reminder` | On demand | Send via Gmail or Resend |
| `reprofile_clients` | After sync | Update all client profiles for user |
| `detect_payments` | On webhook + cron | Balance → 0 → cancel jobs |

### Reminder sequence (fixed MVP)

| Step | Day overdue | Tone |
|------|-------------|------|
| 0 | 0 | Warm |
| 1 | 3 | Friendly |
| 2 | 7 | Professional |
| 3 | 14 | Firm |
| 4 | 21 | Urgent + escalate flag |

---

## Integration specs

### QuickBooks

- **Scope:** `com.intuit.quickbooks.accounting` (read-only MVP)
- **Initial query:** `SELECT * FROM Invoice WHERE Balance > '0'`
- **Customer query:** By CustomerRef from invoices
- **CDC:** `entities=Invoice,Customer,Payment&changedSince={timestamp}`
- **Webhooks:** Invoice Update, Payment Create → fetch entity → update balance
- **Token refresh:** Store new refresh_token on every exchange (critical)
- **Sandbox:** Development; production keys after Intuit app review

### Gmail

- **Scope:** `https://www.googleapis.com/auth/gmail.send`
- **Send:** `users.messages.send` with RFC 2822 raw base64url
- **MVP mode:** Google Cloud Testing (100 test users) until verification
- **Limit:** 500/day personal, 2000/day Workspace

### Resend (non-Gmail path)

- Single sender verification API
- Send via `resend.Emails.send(from=user_verified_email)`
- Open tracking on Resend path only

### Stripe

- Product: GentleTap Pro — $19/month
- Free tier enforced in API: max 5 `sequence_active=true` invoices
- Webhook: update `profiles.plan`

---

## Security

| Item | Implementation |
|------|----------------|
| Token storage | Fernet encrypt refresh tokens in DB |
| API auth | JWT (short-lived access, refresh token) |
| Webhook verification | Intuit HMAC-SHA256, Stripe signature |
| OAuth CSRF | `state` param stored in Redis, 10 min TTL |
| Tenant isolation | All queries filter `user_id` |
| Rate limiting | slowapi on auth + OAuth routes |
| CORS | `app.gentletap.co` only in production |
| Secrets | Never in repo; Railway/Vercel env |

---

## Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Frontend | Vercel | `app.gentletap.co` |
| Marketing | Vercel | `gentletap.co` |
| API | Railway | `api.gentletap.co` |
| Celery worker | Railway (separate service) | — |
| Celery beat | Railway | — |
| Postgres | Supabase | — |
| Redis | Upstash | — |

### Docker Compose (local dev)

```yaml
services:
  api:
    build: ./apps/api
    ports: ["8000:8000"]
    env_file: .env
  worker:
    build: ./apps/api
    command: celery -A gentletap.tasks worker -l info
  beat:
    build: ./apps/api
    command: celery -A gentletap.tasks beat -l info
  redis:
    image: redis:7-alpine
  # Use Supabase cloud DB or local postgres
```

---

## 10-week build timeline

### Week 1 — Foundation

- [ ] Monorepo scaffold (uv/poetry + Next.js)
- [ ] FastAPI app skeleton + health check
- [ ] SQLAlchemy models + Alembic migrations
- [ ] Auth (register/login/JWT)
- [ ] Docker Compose local stack
- [ ] Sentry + basic CI

**Exit:** `POST /auth/register` → JWT → `GET /auth/me`

---

### Week 2 — QuickBooks integration

- [ ] Intuit Developer app (sandbox)
- [ ] OAuth connect + callback + token storage (encrypted)
- [ ] QB API client wrapper
- [ ] Initial invoice + customer sync
- [ ] `GET /invoices`, `GET /invoices/summary`
- [ ] Celery: `sync_qb_invoices`, `refresh_qb_tokens`

**Exit:** Connect sandbox QB → see unpaid invoices in API

---

### Week 3 — Sync reliability + profiling

- [ ] QuickBooks webhooks + signature verification
- [ ] CDC backup sync task
- [ ] Payment detection (Balance → 0)
- [ ] `profiler.py` — client profiles from history
- [ ] `risk_scorer.py` — rule-based risk
- [ ] Next.js: onboarding stages 3–4 (QB + import)

**Exit:** Mark paid in QB sandbox → API reflects within 5 min

---

### Week 4 — Dual email path

- [ ] Google OAuth + Gmail sender
- [ ] Resend sender verification flow
- [ ] Email router (google vs resend)
- [ ] `email_preferences` model
- [ ] Next.js: onboarding stage 5 (email connect)

**Exit:** Send test email via both paths from API

---

### Week 5 — Intelligence engine

- [ ] `IntelligenceEngine.decide()` full pipeline
- [ ] `tone_selector.py`, `timing_optimizer.py`, `escalation.py`
- [ ] `message_generator.py` + OpenAI + prompt templates
- [ ] Banned word guardrails
- [ ] `agent_decisions` logging
- [ ] Unit tests for decision framework

**Exit:** API returns AI draft for a real overdue invoice

---

### Week 6 — Reminders + approval flow

- [ ] Reminder sequence scheduler (Celery beat)
- [ ] `GET /reminders/preview`, `POST /reminders/approve-all`
- [ ] First-batch approval gate
- [ ] Send via intelligence engine output
- [ ] Next.js: onboarding stage 6 (preview + edit + approve)
- [ ] Dashboard stage 7 (green/yellow/red)

**Exit:** Full onboarding → approved reminder sends from user's email

---

### Week 7 — Billing + free tier

- [ ] Stripe Checkout + Customer Portal
- [ ] Webhook → plan update
- [ ] Free tier: 5 active invoice gate
- [ ] Upgrade prompts in API responses
- [ ] PostHog funnel events

**Exit:** Free user blocked at 6th invoice; Pro unlocks

---

### Week 8 — Polish + beta

- [ ] Error states, reconnect flows (QB + Google revoked)
- [ ] Edge cases: partial pay, void, no client email
- [ ] Transactional emails (payment received notification)
- [ ] Landing page (`gentletap.co`)
- [ ] Submit Intuit + Google OAuth verification
- [ ] 5–10 beta users

**Exit:** 1 beta user recovers payment after reminder

---

### Weeks 9–10 — Beta iteration

- [ ] Bug fixes from real QB connections
- [ ] Performance (sync speed, dashboard load)
- [ ] SEO page: "QuickBooks invoice reminder automation"
- [ ] Testimonials
- [ ] Prepare QuickBooks App Store listing

**Exit:** 20 paying or active beta users

---

## Testing strategy

| Layer | Approach |
|-------|----------|
| Intelligence | pytest unit tests with fixture profiles |
| Integrations | VCR.py recorded QB/Gmail sandbox responses |
| API | pytest + httpx AsyncClient |
| E2E | Playwright on onboarding flow (optional week 9) |
| Load | Locust on `/invoices` (pre-launch sanity) |

**Critical test cases:**

- Reliable client, 5 days overdue → warm tone
- Repeat late payer, 18 days → firm tone
- Payment webhook → sequence cancelled
- Free plan 6th invoice → 402 + upgrade URL
- Google token revoked → 401 + reconnect flag
- First batch not approved → no send

---

## Platform approvals (parallel track)

| Platform | Submit | MVP workaround |
|----------|--------|----------------|
| Intuit (QB) | Week 7 | Sandbox + development keys |
| Google (`gmail.send`) | Week 7 | Testing mode, 100 users |
| Stripe | Week 7 | Test → live at launch |
| Resend | Week 4 | Immediate |

**Required docs:** Privacy policy, Terms, data retention policy, OAuth justification for Gmail send scope.

---

## Cost estimate

| Phase | Monthly cost |
|-------|--------------|
| Dev / beta (0–20 users) | $30–80 |
| Launch (50–200 users) | $100–250 |
| 500 paying users | $400–800 |

| Service | Est. cost |
|---------|-----------|
| Railway (API + 2 workers) | $20–50 |
| Vercel Pro | $20 |
| Supabase Pro | $25 |
| Upstash Redis | $0–10 |
| OpenAI | $20–150 (scales with reminders) |
| Resend | $0–20 |
| Sentry | $0–26 |

---

## MVP scope boundaries

### In scope

- QuickBooks OAuth + sync + webhooks
- Gmail OAuth + Resend verified sender
- Python intelligence engine (rules + OpenAI)
- Client profiling (pandas aggregates)
- Fixed 5-step reminder sequence
- First-batch approval → autonomous
- Dashboard green/yellow/red
- Stripe Free (5) / Pro ($19)

### Out of scope (v1.1+)

- Xero, FreshBooks, Stripe invoicing, CSV
- WhatsApp / Twilio
- LangGraph multi-agent loops
- ML payment prediction (sklearn model)
- Send from custom domain (DNS wizard)
- Microsoft Graph / Outlook OAuth
- Agency multi-seat
- QuickBooks App Store (submit prep only)

---

## Phase 2 roadmap (post-MVP)

| Feature | Tech |
|---------|------|
| Payment prediction model | sklearn on `agent_decisions` + outcomes |
| LangGraph agent | Multi-step: check reply → adjust → send |
| WhatsApp channel | Twilio + Meta templates |
| Xero / FreshBooks | Same integration pattern as QB |
| Optimal send time ML | Learn from open/reply timestamps |
| A/B tone testing | pandas + statistical lift |
| QB App Store launch | Intuit marketplace listing |

---

## Success metrics

| Metric | Week 8 target | Week 10 target |
|--------|---------------|----------------|
| Beta users connected QB | 10 | 25 |
| Reminders sent | 50 | 200 |
| Payments after reminder | 3 | 10 |
| Free → Pro conversion | 2 | 10 |
| Onboarding completion (QB → live) | 60% | 75% |
| Avg onboarding time (Gmail path) | < 6 min | < 5 min |

---

## Getting started (Day 1 checklist)

1. Create [developer.intuit.com](https://developer.intuit.com) app (QB sandbox)
2. Create Google Cloud project → enable Gmail API → OAuth consent (Testing)
3. Create Supabase project → get Postgres URL
4. Create Upstash Redis
5. Create OpenAI API key
6. Create Resend account
7. Create Stripe account (test mode)
8. Clone repo scaffold → `docker compose up`
9. Run Alembic migrations
10. Hit `GET /health` → `POST /auth/register`

---

## Summary

GentleTap is built **AI-native in Python**: the `IntelligenceEngine` is the product, not an afterthought. FastAPI + Celery handle integrations and scheduling; Next.js delivers the 6-minute onboarding experience; Supabase stores state; OpenAI generates copy; QuickBooks and Gmail provide the data and send capability.

**Ship order:** QB sync → profiling → intelligence → email → approval → autonomous → billing.

---

*Document owner: GentleTap founder. Update this file as scope changes.*
