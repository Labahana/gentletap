# GentleTap — Production checklist

## ✅ Core product (complete)

- [x] Auth: register, login, JWT refresh rotation, logout
- [x] QuickBooks OAuth, sync, webhooks (legacy + CloudEvents), payment detection
- [x] Gmail OAuth + Resend sender verification + delivery router
- [x] AI intelligence: risk, tone, channel, escalation, message generation
- [x] Reminder sequences (day 0/3/7/14/21), Celery beat, approve-all
- [x] WhatsApp via Twilio (Pro, step 1+)
- [x] Stripe billing (Option B: Starter free / Pro $19 / Pro+ $39 / Team $59)
- [x] Dashboard, onboarding, invoice detail, escalations, settings
- [x] Notifications + mark-read, sync_logs, rate limiting, CI
- [x] Privacy & Terms pages

## 🔧 Before launch (ops)

- [ ] Supabase project + run migrations (`alembic upgrade head`)
- [ ] Intuit, Google, OpenAI, Stripe, Resend keys in production `.env`
- [ ] Google OAuth verification (2–4 weeks) for Gmail in production
- [ ] Twilio WhatsApp Business setup (Pro channel)
- [ ] Register webhook URLs: QB, Stripe, Resend → `https://gentletap.co/v1/webhooks/*`
- [ ] Optional: `SENTRY_DSN` for error tracking

## 📋 v1.1 (post-launch)

- [ ] FreshBooks / Xero / CSV import
- [ ] Client portal payment links
- [ ] A/B tone experiments
