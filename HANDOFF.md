# GentleTap — Handoff (Agent change)

Project: **Merge old GentleTap into the new project** (keep new blue design + Vite SPA + org model).

## Repository layout
- **Base (new project, where you do all work):** `C:\Users\HomePC\Music\2-gentletap`
  - `backend/` — FastAPI app (python, package `app/`)
  - `frontend/` — Vite + React SPA (blue design, Tailwind v3, Inter, lucide-react, brand blue `#2563eb`)
  - `docker-compose.yml` — api / web (nginx) / worker / beat / redis / postgres
  - `gentletap-main (1)/gentletap-main` — the **old** project; this is the *source* we copy code from and adapt.
- Branch is `main`. VPS is at `/opt/gentletap`, updated with:
  `cd /opt/gentletap && git pull origin main && docker compose up -d --build`

## How we work
- Do work in phases (fully listed below). **Commit + push after each phase** so the VPS can be updated incrementally.
- When copying old files, first copy them into the new tree, then adapt imports:
  - `gentletap.` → `app.`
  - `user_id` references get re-mapped to `org_id` (new model is org-scoped).
  - All new pages/components must use the **blue design system** (Tailwind v3, Inter, lucide-react, `#2563eb`).
- Alembic migrations are used for schema changes. **They are intentionally idempotent** (they inspect the DB and skip existing tables/columns) so they run cleanly on the existing VPS database and on fresh databases. Keep new migrations idempotent.

---

## Progress summary

| Phase | Status | What was delivered |
|---|---|---|
| 1. Deployment hardening | ✅ Pushed `b625a75` | Production frontend build (multi-stage Dockerfile: npm ci → vite build → nginx:alpine serving `dist/` with SPA fallback + `/api` proxy to `api:8000`). nginx security/gzip headers. Fixed login/signup proxy (VITE_API_URL / nginx proxy → `api:8000`). Redis/Celery worker fixes (broker_connection_retry_on_startup, celerybeat-schedule filename, result_expires, task expires + time limits). Auto-migrations on API startup (alembic upgrade head, SKIP_DB_MIGRATIONS override). Compose hardening (worker/beat healthchecks, remove worker container_name to allow `--scale`, ports bound to `127.0.0.1`, removed public Postgres port). Fixed Google OAuth redirect mismatch. |
| 2. Compliance & recovery | ✅ PUSHED `dad7a10` | Forgot/reset password flow (Redis tokens + email). Forgot-password / reset-password pages (blue design). Legal pages (privacy, terms, cookies, refund) in footer. Scrub real secrets from `.env.example`. |
| 3. Core features | ✅ PUSHED `1ba7658` | Scheduled OAuth token refresh for QB/FreshBooks/Google (sync no longer silently dies). `/analytics` endpoint + full Analytics page with charts. `/usage` metering endpoint + plan-limit enforcement. Notification system (model, migration, API, bell dropdown with unread counts). |
| 4. Admin & power features | ✅ PUSHED `6d7aa48` | Escalation rules CRUD (`/escalation-rules`, org-scoped, max 25 rules) + Escalations page rules panel. Admin API extended (`/admin/users` paginated, `/admin/audit-log`). |
| Fix — API container crash | ✅ PUSHED `27dd13c` | Migrations made idempotent (skip existing tables/columns). On the VPS this fixed a crash where `phase2_001` tried to re-create tables that already existed from the app's `create_all` startup. **Note:** the backend `lifespan` still calls `Base.metadata.create_all` on startup AND the Docker entrypoint runs `alembic upgrade head` first. Keep these two in sync / idempotent, or you will re-trigger this exact crash. |
| 5. SEO / affiliate / intelligence | ⏳ NOT STARTED | See "Phase 5" below. |

Git log (newest → oldest):
```
27dd13c Fix API container crash: make alembic migrations idempotent
6d7aa48 Phase 4: escalation rules CRUD + admin users/audit-log endpoints
1ba7658 Phase 3: token refresh, analytics, usage metering, notifications
dad7a10 Phase 2: password recovery, legal pages, secret cleanup
b625a75 Phase 1: production deployment hardening
```

---

## PENDING FIX — Login / Signup not reaching the Dashboard

**Symptom (reported by owner):** after a user logs in or signs up on the live site, the site does **not** take them to `/dashboard`; it stays on the login page.

### Code walk-through so far (already diagnosed)
- `frontend/src/pages/Login.tsx` on submit:
  ```ts
  const res = await api.post('/auth/login', { email, password });
  const data = res.data;
  setAuth({ user: {...}, orgId: data.org_id, orgName: data.org_name, plan: data.plan,
             accessToken: data.access_token, refreshToken: data.refresh_token });
  navigate('/dashboard');
  ```
  If the request succeeds, it **always** navigates to `/dashboard`. So "stays on login" means one of:
  1. `api.post('/auth/login', ...)` **throws** (network / CORS / wrong URL) → caught → `setError(...)` and the page stays. (But then the user would see an error banner — ask/verify whether they see an error.)
  2. `navigate('/dashboard')` runs but `ProtectedRoute` (App.tsx) immediately redirects back to `/login`.
- `frontend/src/stores/authStore.ts` — `setAuth` writes `gentletap_access_token` / `gentletap_refresh_token` / `gentletap_org_id` / `gentletap_org_name` / `gentletap_plan` / `gentletap_user` to localStorage and sets `isAuthenticated: true`.
- `frontend/src/App.tsx` — `ProtectedRoute` checks `isAuthenticated` from `useAuthStore()`; if falsy → `<Navigate to="/login" replace />`. `/dashboard` is inside `<Layout/>` protected route.
- `frontend/src/lib/api.ts` — axios baseURL `'/api/v1'`, request interceptor reads `gentletap_access_token` from localStorage. **Note:** there is an empty `if (error.response?.status === 401)` slot for refresh logic that is intentionally not yet implemented.
- `backend/app/api/auth.py`:
  - `POST /login` returns `TokenResponse` with exactly the camelCase fields the frontend reads: `user_id`, `org_id`, `org_name`, `plan`, `access_token`, `refresh_token`, `full_name`.
  - `POST /signup` auto-creates an `Organization`, `OrganizationMember` (role owner), onboarding, then returns the same `TokenResponse`.
- `backend/app/schemas/auth.py` — `TokenResponse` fields confirmed: access_token, refresh_token, token_type, expires_in, user_id, email, full_name, org_id, org_name, plan.
- Routing: frontend `api` baseURL `/api/v1` → nginx (`frontend/nginx.conf`) proxies `location /api/` to `http://api:8000`, and `main.py` includes auth router at prefix `/api/v1`. So the full path is `/api/v1/auth/login`. This is correct.

### DIAGNOSIS COMPLETE — results (verified live on 2026-08-23)
Everything server-side is healthy RIGHT NOW:
- `POST https://gentletap.co/api/v1/auth/login` → **HTTP 200**, returns every field the frontend reads (`user_id`, `org_id`, `org_name`, `plan`, `access_token`, `refresh_token`).
- `POST /api/v1/auth/signup` → **HTTP 200** (created throwaway account agenttest9182@gmail.com).
- `POST /api/v1/auth/refresh` → **HTTP 200** (rotated tokens fine).
- CORS preflight OPTIONS passes for gentletap.co / www / localhost:3000; actual POST carries `access-control-allow-origin`. **Note: in production the SPA calls `/api/...` same-origin through nginx, so CORS never even applies there.**
- The deployed bundle (`/assets/index-C_yGzAdH.js`) was **byte-identical (md5 c8f2dca3600c1a05bef3da1c0570fa18)** to a fresh local build of the current source — so the VPS was NOT serving stale code.
- Client code review: Login.tsx, Signup.tsx, GoogleAuthCallback.tsx all do `setAuth(...)` then `navigate('/dashboard')`; authStore.setAuth writes localStorage + sets `isAuthenticated: true` synchronously; ProtectedRoute only redirects when `isAuthenticated` is falsy. No component auto-redirects back to /login.

Conclusion: no reproducible failure exists in the current deployed code+backend for email login/signup at gentletap.co. The report most likely dates from the api-down window (when the API container was unhealthy) or a transient state. The one REAL defect class found: **access tokens expire after 15 minutes (`expires_in: 900`) and the 401 response interceptor was an empty stub** — so any session older than 15 min silently broke (all API calls 401 with no refresh/retry/logout), which users experience as "the site doesn't work after logging in".

### FIXES SHIPPED (this commit)
1. `frontend/src/lib/api.ts`: real 401 handling — single-flight refresh via `/auth/refresh`, retry original request once with the new token; on refresh failure call `logout()` so ProtectedRoute cleanly returns to /login. Added `apiErrorMessage()` helper that distinguishes network failures from API errors.
2. `frontend/src/pages/Login.tsx` + `Signup.tsx`: `navigate('/dashboard', { replace: true })` (back button no longer bounces to login) and clearer error banners ("Cannot reach the server…" vs "Invalid credentials").
3. Frontend rebuilt locally to verify compile (`dist/assets/index-BSX0ojUV.js`).

### If the owner STILL sees "stays on login" after deploying this
Ask for the exact red error text shown on the form and which URL they browse (domain vs VPS IP). If NO error appears and it truly silently stays: open DevTools → Network tab, redo login, check the status of `POST /api/v1/auth/login` and whether URL changes to `/dashboard` — report both.

### Recommended next debugging step (what was in progress)
Test the live auth flow first:
```
curl -s -X POST https://<deployed-host>/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@gentletap.com","password":"password123"}'
```
✅ DONE — see results above.

---

## Phase 5 — NOT STARTED (SEO content, affiliates, intelligence)

Follow the exact plan in `.zcode/plans/plan-sess_33972f3b-1a9b-4137-a0ff-89acaa304a8c.md` items 18–20. Port the old sources in `gentletap-main (1)/gentletap-main` (blog posts, comparison pages, affiliate models/routers/services, `intelligence/` package for risk scorer / channel selector / tone selector / timing optimizer — wire behind the existing AI/Kimi layer).

---

## Security reminders (Owner-was told)
- **Rotate on the VPS + in the Paddle dashboard:** the Paddle webhook secret and JWT/token-encryption keys were once committed. They are scrubbed from `.env.example` now, but they still exist in git history. Rotating them removes any exploit window.
- **ci caches** — if you change frontend deps (pnode versions), `npm ci` uses the lock file. Do NOT hand-edit `frontend/package.json` and `package-lock.json` independently; regenerate.

## Notes / gotchas for the next agent
- The API container **must not crash on startup**. The single highest-cost bug in this project was the `create_all` vs `alembic` re-create collision → whole stack aborts when api is unhealthy. If the api container is unhealthy, run `docker compose logs api | tail -50`.
- Keep every new alembic migration **idempotent**.
- The google auth callback page is wired, but `google_client_id` defaults empty and the code contains a `demo@gentletalk.com` fallback — do not push real Google creds into the repo.
- `frontend/nginx.conf` must keep the `/api/` proxy to `http://api:8000` and the SPA fallback `location /` → `/index.html`. Do not remove the security headers.
- The web container now serves on host port `127.0.0.1:3000`. The VPS nginx may proxy to that — confirm the host port did not change in the deployed environment.