# scanYa: Security Hardening & Supabase Migration

**Date:** 2026-04-05
**Status:** Approved
**Goal:** Ship a secure, production-ready small SaaS by migrating from custom auth + MongoDB to Supabase, adding email notifications, and hardening the API.
**Deployment target:** Vercel (serverless API + static web)
**Scale target:** Small SaaS — tens of asset owners, hundreds of bookings/month

---

## 1. Auth Migration (Custom → Supabase Auth)

### What changes

- Remove custom `registerUser()`, `login()`, session management from `store.ts`
- Remove `auth.ts` middleware (attachAuth, requireAuth, requireRole)
- Remove MongoDB `users` and `sessions` collections
- Frontend uses `@supabase/supabase-js` client for all auth flows:
  - `supabase.auth.signUp()` / `supabase.auth.signInWithPassword()`
  - Automatic token storage, refresh, and persistence (fixes session-lost-on-refresh)
- API verifies JWTs via `supabase.auth.getUser(token)` extracted from Authorization header
- User metadata (role, name, company) stored in a `profiles` table linked to `auth.users.id`

### What this fixes

- Plaintext password storage
- Session lost on page refresh
- Sessions never expiring
- Weak token generation (`Math.random`)
- No logout cleanup

### Files affected

- Delete: `apps/api/src/auth.ts` (entire file)
- Heavy edit: `apps/api/src/store.ts` (remove auth/session methods)
- Heavy edit: `apps/web/src/state/AppContext.js` (replace auth state with Supabase client)
- Heavy edit: `apps/web/src/api.js` (remove auth API calls)
- New: `apps/web/src/lib/supabase.js` (Supabase client init)
- Edit: `apps/web/src/pages/LoginPage.js` (use Supabase auth)

---

## 2. Database Migration (MongoDB → Supabase Postgres)

### What changes

- Drop MongoDB dependency (`mongodb` package, `MongoStore` class)
- Use Supabase Postgres with the existing `db/schema.sql` as the base, extended with:
  - `profiles` table (id FK to auth.users, role, name, company)
  - Updated `bookings` table with `pending_verification` status for anonymous bookings
- Use Supabase JS client for all DB operations: `supabase.from('assets').select(...)`
- Row Level Security (RLS) policies:
  - `assets`: anyone reads published; owner reads/writes own
  - `bookings`: requester reads own; asset owner reads/updates for their assets
  - `qr_codes`: owner CRUDs; anyone reads active tokens
  - `profiles`: user reads/updates own; public reads name only
  - `asset_availability_rules`: anyone reads; asset owner writes for own assets
- Booking conflict detection via Postgres exclusion constraint or DB function (atomic, race-safe)
- Availability queries use SQL with proper indexes instead of JS loops

### What this fixes

- No schema enforcement
- Race conditions in booking conflict detection (JS-level check)
- Access control enforced only at API layer (now also at DB layer)
- MongoDB driver cold start overhead on Vercel

### Files affected

- Heavy edit: `apps/api/src/store.ts` (replace MongoStore with Supabase queries, delete MemoryStore)
- Edit: `apps/api/package.json` (remove `mongodb`, add `@supabase/supabase-js`)
- Edit: `db/schema.sql` (add profiles table, update booking statuses, add RLS policies)
- New: `apps/api/src/lib/supabase.ts` (server-side Supabase client with service role key)

---

## 3. API Simplification

### What changes

The Express API on Vercel becomes a thin layer for business logic only. Most reads move to the frontend via the Supabase client.

**Frontend direct (via Supabase client, no API):**
- List published assets
- Get asset availability
- Get month availability
- Resolve QR token
- All auth flows (login, register, session refresh)
- User profile read/update

**Kept as Express API routes (server-side validation + side effects):**
- `POST /bookings` — validate business rules, check conflicts, trigger email
- `POST /bookings/:id/confirm` — owner action + email to requester
- `POST /bookings/:id/reject` — owner action + email to requester
- `POST /assets` — create with validation
- `PATCH /assets/:id` — update with validation
- `POST /assets/:id/publish` / `unpublish`
- `POST /assets/:id/qr` — generate QR token
- `GET /bookings/verify/:token` — anonymous booking email verification (public, moves booking from `pending_verification` → `pending`)

**Deleted API routes:**
- `POST /auth/register` — Supabase Auth
- `POST /auth/login` — Supabase Auth
- `GET /me`, `PATCH /me` — frontend direct via Supabase
- `GET /assets` (public list) — frontend direct
- `GET /assets/:id/availability` — frontend direct
- `GET /assets/:id/availability/month` — frontend direct
- `GET /q/:token` — frontend direct
- `GET /bookings/mine` — frontend direct (RLS scoped)
- `GET /owner/bookings` — frontend direct (RLS scoped)
- `GET /qr/mine` — frontend direct (RLS scoped)

### Files affected

- Heavy edit: `apps/api/src/server.ts` (remove ~60% of routes)
- Heavy edit: `apps/api/src/store.ts` (becomes small service layer for booking/asset business logic)
- Edit: `apps/web/src/api.js` (remove calls that move to Supabase client)
- Edit: `apps/web/src/state/AppContext.js` (use Supabase client for reads)

---

## 4. Email Notifications

### What changes

- Add Resend (`resend` npm package) to the API
- Send transactional emails from Express API routes at these trigger points:
  1. **Booking created** → email to asset owner (booking details, link to workspace)
  2. **Booking confirmed** → email to requester contactEmail
  3. **Booking rejected** → email to requester contactEmail
- **Anonymous booking verification:**
  - Unauthenticated bookings get status `pending_verification`
  - Verification email sent to contactEmail with a confirmation link
  - Clicking link moves status to `pending` (visible to owner)
  - Link expires after 24 hours
  - Prevents spam bookings reaching the owner

### Email format

Plain text or minimal inline-styled HTML. No template engine. Each email contains:
- Booking details (asset name, date/time, contact info)
- Action link (to workspace for owner, to booking status for requester)
- No images, no complex layouts

### Files affected

- New: `apps/api/src/email.ts` (Resend client + send functions)
- Edit: `apps/api/src/server.ts` (call email functions from booking routes)
- Edit: `apps/api/package.json` (add `resend`)
- New env vars: `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`

---

## 5. Rate Limiting & Security Headers

### What changes

- Add `express-rate-limit` middleware:
  - `POST /bookings` — 10 req/min per IP
  - Asset write routes — 20 req/min per IP
  - General fallback — 100 req/min per IP
- Add `helmet` middleware (HSTS, X-Frame-Options, CSP, X-Content-Type-Options)
- Tighten CORS to explicit origins only:
  - Production Vercel URL
  - `http://localhost:5173` for dev
  - Remove wildcard `*.vercel.app` pattern

### Files affected

- Edit: `apps/api/src/server.ts` (add helmet, rate-limit middleware, tighten CORS)
- Edit: `apps/api/package.json` (add `helmet`, `express-rate-limit`)

---

## What is explicitly deferred

These are real gaps but won't hurt the first wave of users:

- **Test coverage** — no unit/integration/e2e tests added in this pass
- **CI/CD pipeline** — no GitHub Actions
- **AppContext refactor** — monolithic context stays; works fine at this scale
- **API versioning** — single client, not needed yet
- **Structured logging / observability** — console.log is fine for now
- **Store file refactor** — it shrinks significantly from the migration, good enough
- **Soft deletes / audit trail** — not needed at launch scale

---

## Environment Variables (final state)

```
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhb...
SUPABASE_SERVICE_ROLE_KEY=eyJhb...  # API only, never exposed to frontend

# Email
RESEND_API_KEY=re_xxxxx
EMAIL_FROM_ADDRESS=bookings@scanya.app

# Vercel
APP_BASE_URL=https://scanya.vercel.app
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhb...

# Removed
# MONGODB_URI (no longer needed)
# MONGODB_DB_NAME (no longer needed)
# SESSION_SECRET (no longer needed)
```

---

## Net outcome

- **Deleted:** custom auth, session management, MongoDB driver, ~60% of API routes, MemoryStore
- **Added:** Supabase client (frontend + backend), Resend email, helmet, rate-limit
- **Result:** Less code, more secure, better UX (persistent sessions), email notifications, atomic booking conflicts
