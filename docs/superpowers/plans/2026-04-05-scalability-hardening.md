# Security Hardening & Supabase Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate scanYa from custom auth + MongoDB to Supabase (Auth + Postgres), add email notifications, and harden the API — shipping a secure small SaaS.

**Architecture:** Replace custom auth with Supabase Auth, MongoDB with Supabase Postgres + RLS, simplify Express API to handle only business-logic writes, and add Resend for transactional emails. Frontend talks directly to Supabase for reads and auth.

**Tech Stack:** Supabase (Auth, Postgres, RLS), Express on Vercel (serverless), React + Vite, Resend (email), helmet, express-rate-limit, Zod.

**Spec:** `docs/superpowers/specs/2026-04-05-scalability-hardening-design.md`

---

## File Structure

### New files
- `apps/api/src/lib/supabase.ts` — Server-side Supabase client (service role key)
- `apps/api/src/middleware/auth.ts` — New JWT-based auth middleware using Supabase
- `apps/api/src/email.ts` — Resend client + email send functions
- `apps/web/src/lib/supabase.js` — Frontend Supabase client (anon key)
- `db/migrations/001_schema.sql` — Full Postgres schema with RLS policies
- `db/migrations/002_booking_verification.sql` — Anonymous booking verification support

### Modified files
- `apps/api/package.json` — Swap mongodb for @supabase/supabase-js, add resend, helmet, express-rate-limit
- `apps/api/src/server.ts` — Remove ~60% of routes, add helmet/rate-limit, new auth middleware
- `apps/api/src/store.ts` — Replace MongoStore with Supabase Postgres queries, remove MemoryStore
- `apps/web/src/api.js` — Remove auth/read calls, keep only write calls to Express API
- `apps/web/src/state/AppContext.js` — Replace auth state with Supabase client, direct Supabase reads
- `apps/web/src/pages/LoginPage.js` — Use Supabase auth
- `apps/web/src/App.js` — Add booking verification route
- `.env.example` — Update with Supabase + Resend env vars

### Deleted files
- `apps/api/src/auth.ts` — Replaced by new Supabase JWT middleware

---

## Task 1: Set Up Supabase Postgres Schema + RLS

**Files:**
- Create: `db/migrations/001_schema.sql`
- Modify: `.env.example`

This task sets up the database foundation. Run this SQL in your Supabase project's SQL editor.

- [ ] **Step 1: Create the profiles table and core schema**

Create `db/migrations/001_schema.sql`:

```sql
-- Profiles table (linked to Supabase Auth)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role varchar(32) not null check (role in ('asset_owner', 'event_organizer', 'attendee')),
  name varchar(255) not null,
  company varchar(255),
  created_at timestamptz not null default now()
);

-- Assets
create table assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id),
  title varchar(255) not null,
  category varchar(120) not null,
  description text not null,
  location varchar(255) not null,
  minimum_notice_hours int not null default 0,
  minimum_rental_hours int not null default 1,
  price_label varchar(255) not null,
  status varchar(32) not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now()
);

-- Availability rules
create table asset_availability_rules (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_hour int not null check (start_hour between 0 and 23),
  end_hour int not null check (end_hour between 1 and 24)
);

-- Bookings
create table bookings (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id),
  requester_id uuid references profiles(id),
  contact_name varchar(255) not null,
  contact_email varchar(255) not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status varchar(32) not null default 'pending'
    check (status in ('pending_verification', 'pending', 'confirmed', 'rejected', 'cancelled', 'completed')),
  verification_token varchar(255) unique,
  verification_expires_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

-- QR codes
create table qr_codes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id),
  target_type varchar(32) not null check (target_type in ('asset_booking', 'event_page')),
  target_id uuid not null,
  token varchar(255) not null unique,
  status varchar(32) not null default 'active' check (status in ('active', 'disabled')),
  scan_count int not null default 0
);

-- Indexes
create index idx_assets_owner on assets(owner_id);
create index idx_assets_status on assets(status);
create index idx_bookings_asset on bookings(asset_id);
create index idx_bookings_requester on bookings(requester_id);
create index idx_bookings_time on bookings(asset_id, start_at, end_at);
create index idx_availability_asset on asset_availability_rules(asset_id);
create index idx_qr_token on qr_codes(token);
create index idx_bookings_verification on bookings(verification_token) where verification_token is not null;
```

- [ ] **Step 2: Add RLS policies**

Append to `db/migrations/001_schema.sql`:

```sql
-- Enable RLS on all tables
alter table profiles enable row level security;
alter table assets enable row level security;
alter table asset_availability_rules enable row level security;
alter table bookings enable row level security;
alter table qr_codes enable row level security;

-- Profiles: users read/update own, public reads name+role
create policy "Users read own profile"
  on profiles for select using (auth.uid() = id);
create policy "Users update own profile"
  on profiles for update using (auth.uid() = id);
create policy "Public reads profile name"
  on profiles for select using (true);

-- Assets: anyone reads published, owner manages own
create policy "Public reads published assets"
  on assets for select using (status = 'published');
create policy "Owner reads own assets"
  on assets for select using (auth.uid() = owner_id);
create policy "Owner inserts assets"
  on assets for insert with check (auth.uid() = owner_id);
create policy "Owner updates own assets"
  on assets for update using (auth.uid() = owner_id);

-- Availability rules: anyone reads, owner manages for own assets
create policy "Public reads availability"
  on asset_availability_rules for select using (true);
create policy "Owner manages availability"
  on asset_availability_rules for all using (
    asset_id in (select id from assets where owner_id = auth.uid())
  );

-- Bookings: requester reads own, asset owner reads for their assets
create policy "Requester reads own bookings"
  on bookings for select using (auth.uid() = requester_id);
create policy "Asset owner reads bookings"
  on bookings for select using (
    asset_id in (select id from assets where owner_id = auth.uid())
  );
create policy "Anyone creates bookings"
  on bookings for insert with check (true);
create policy "Asset owner updates booking status"
  on bookings for update using (
    asset_id in (select id from assets where owner_id = auth.uid())
  );

-- QR codes: owner manages, anyone reads active
create policy "Public reads active QR codes"
  on qr_codes for select using (status = 'active');
create policy "Owner manages QR codes"
  on qr_codes for all using (auth.uid() = owner_id);

-- Auto-create profile on signup (trigger)
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, role, name, company)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'attendee'),
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.raw_user_meta_data->>'company'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
```

- [ ] **Step 3: Run the migration in Supabase SQL editor**

Go to your Supabase project dashboard → SQL Editor → paste the full `db/migrations/001_schema.sql` → Run.

Verify: Go to Table Editor and confirm all 5 tables exist (profiles, assets, asset_availability_rules, bookings, qr_codes).

- [ ] **Step 4: Update .env.example**

Replace the contents of `.env.example` with:

```
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhb...
SUPABASE_SERVICE_ROLE_KEY=eyJhb...

# Email
RESEND_API_KEY=re_xxxxx
EMAIL_FROM_ADDRESS=bookings@scanya.app

# App
APP_BASE_URL=http://localhost:5173
API_PORT=4000

# Frontend (VITE_ prefix exposes to browser)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhb...
VITE_API_BASE_URL=http://localhost:4000
```

- [ ] **Step 5: Commit**

```bash
git add db/migrations/001_schema.sql .env.example
git commit -m "feat(db): add Supabase Postgres schema with RLS policies"
```

---

## Task 2: Install Dependencies

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/web/package.json` (if it exists, otherwise root)

- [ ] **Step 1: Update API dependencies**

```bash
cd /Users/thabomollomponya/Dev/scanYa
npm --workspace @scanya/api install @supabase/supabase-js resend helmet express-rate-limit
npm --workspace @scanya/api uninstall mongodb
```

- [ ] **Step 2: Install Supabase client in web app**

```bash
npm --workspace @scanya/web install @supabase/supabase-js
```

- [ ] **Step 3: Verify both packages install cleanly**

```bash
npm install
```

Expected: No errors. `node_modules` updates, lockfile updates.

- [ ] **Step 4: Commit**

```bash
git add apps/api/package.json apps/web/package.json package-lock.json
git commit -m "chore(deps): swap mongodb for supabase, add resend + security packages"
```

---

## Task 3: Create Supabase Client Libraries

**Files:**
- Create: `apps/api/src/lib/supabase.ts`
- Create: `apps/web/src/lib/supabase.js`

- [ ] **Step 1: Create server-side Supabase client**

Create `apps/api/src/lib/supabase.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

// Service role client — bypasses RLS, used for server-side operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Create a client scoped to a specific user's JWT (respects RLS)
export function supabaseForUser(accessToken: string) {
  return createClient(supabaseUrl!, process.env.SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
```

- [ ] **Step 2: Create frontend Supabase client**

Create `apps/web/src/lib/supabase.js`:

```javascript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/lib/supabase.ts apps/web/src/lib/supabase.js
git commit -m "feat: add Supabase client libraries for API and web"
```

---

## Task 4: Replace Auth Middleware

**Files:**
- Create: `apps/api/src/middleware/auth.ts`
- Delete: `apps/api/src/auth.ts`
- Modify: `apps/api/src/server.ts` (import change only in this task)

- [ ] **Step 1: Create new Supabase JWT auth middleware**

Create `apps/api/src/middleware/auth.ts`:

```typescript
import type { Response, NextFunction } from "express";
import { supabaseAdmin } from "../lib/supabase.js";

export interface AuthenticatedRequest extends Express.Request {
  userId?: string;
  userRole?: string;
}

export const attachAuth = async (
  request: AuthenticatedRequest,
  _response: Response,
  next: NextFunction,
) => {
  try {
    const authorization = request.headers?.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      next();
      return;
    }

    const token = authorization.slice("Bearer ".length);
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (!error && data.user) {
      request.userId = data.user.id;

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      request.userRole = profile?.role;
    }

    next();
  } catch {
    next();
  }
};

export const requireAuth = (
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction,
) => {
  if (!request.userId) {
    response.status(401).json({ error: "Authentication required." });
    return;
  }
  next();
};

export const requireRole =
  (...roles: string[]) =>
  (request: AuthenticatedRequest, response: Response, next: NextFunction) => {
    if (!request.userId) {
      response.status(401).json({ error: "Authentication required." });
      return;
    }
    if (!request.userRole || !roles.includes(request.userRole)) {
      response.status(403).json({ error: "You do not have access to this action." });
      return;
    }
    next();
  };
```

- [ ] **Step 2: Delete the old auth file**

```bash
rm apps/api/src/auth.ts
```

- [ ] **Step 3: Update the import in server.ts**

In `apps/api/src/server.ts`, change line 4 from:

```typescript
import { attachAuth, requireAuth, requireRole } from "./auth.js";
```

to:

```typescript
import { attachAuth, requireAuth, requireRole } from "./middleware/auth.js";
```

Also delete the `types.js` import (line 6) and the `AuthenticatedRequest` type references — they now come from the middleware. Replace:

```typescript
import type { AuthenticatedRequest } from "./types.js";
```

with:

```typescript
import type { AuthenticatedRequest } from "./middleware/auth.js";
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/thabomollomponya/Dev/scanYa && npm --workspace @scanya/api run typecheck
```

Expected: May have errors from store.ts (expected — we haven't migrated it yet). The auth middleware itself should compile cleanly.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/middleware/auth.ts apps/api/src/server.ts
git rm apps/api/src/auth.ts
git commit -m "feat(api): replace custom auth with Supabase JWT middleware"
```

---

## Task 5: Rewrite Store Layer (MongoDB → Supabase Postgres)

**Files:**
- Modify: `apps/api/src/store.ts` (full rewrite)

This is the biggest task. The 963-line store becomes a ~250-line service layer using Supabase queries.

- [ ] **Step 1: Replace store.ts with Supabase implementation**

Replace the entire contents of `apps/api/src/store.ts` with:

```typescript
import { supabaseAdmin } from "./lib/supabase.js";
import crypto from "node:crypto";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CreateAssetInput {
  title: string;
  category: string;
  description: string;
  location: string;
  minimumNoticeHours: number;
  minimumRentalHours: number;
  priceLabel: string;
}

export interface CreateBookingInput {
  assetId: string;
  contactName: string;
  contactEmail: string;
  startAt: string;
  endAt: string;
  notes?: string;
}

// ─── Assets ─────────────────────────────────────────────────────────────────

export async function createAsset(ownerId: string, input: CreateAssetInput) {
  const { data, error } = await supabaseAdmin
    .from("assets")
    .insert({
      owner_id: ownerId,
      title: input.title,
      category: input.category,
      description: input.description,
      location: input.location,
      minimum_notice_hours: input.minimumNoticeHours,
      minimum_rental_hours: input.minimumRentalHours,
      price_label: input.priceLabel,
      status: "draft",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateAsset(
  assetId: string,
  ownerId: string,
  input: Partial<CreateAssetInput>,
) {
  const updateData: Record<string, unknown> = {};
  if (input.title !== undefined) updateData.title = input.title;
  if (input.category !== undefined) updateData.category = input.category;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.location !== undefined) updateData.location = input.location;
  if (input.minimumNoticeHours !== undefined) updateData.minimum_notice_hours = input.minimumNoticeHours;
  if (input.minimumRentalHours !== undefined) updateData.minimum_rental_hours = input.minimumRentalHours;
  if (input.priceLabel !== undefined) updateData.price_label = input.priceLabel;

  const { data, error } = await supabaseAdmin
    .from("assets")
    .update(updateData)
    .eq("id", assetId)
    .eq("owner_id", ownerId)
    .select()
    .single();

  if (error) throw new Error("Asset not found or access denied.");
  return data;
}

export async function setAssetStatus(
  assetId: string,
  ownerId: string,
  status: "draft" | "published" | "archived",
) {
  const { data, error } = await supabaseAdmin
    .from("assets")
    .update({ status })
    .eq("id", assetId)
    .eq("owner_id", ownerId)
    .select()
    .single();

  if (error) throw new Error("Asset not found or access denied.");
  return data;
}

// ─── Bookings ───────────────────────────────────────────────────────────────

export async function createBooking(
  requesterId: string | null,
  input: CreateBookingInput,
) {
  // Validate asset exists and is published
  const { data: asset, error: assetError } = await supabaseAdmin
    .from("assets")
    .select("*")
    .eq("id", input.assetId)
    .eq("status", "published")
    .single();

  if (assetError || !asset) throw new Error("Asset not found or not available.");

  const startAt = new Date(input.startAt);
  const endAt = new Date(input.endAt);
  const now = new Date();

  // Validate booking window
  if (endAt <= startAt) throw new Error("End time must be after start time.");

  const durationHours = (endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60);
  if (durationHours < asset.minimum_rental_hours) {
    throw new Error(`Minimum rental is ${asset.minimum_rental_hours} hours.`);
  }

  const noticeHours = (startAt.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (noticeHours < asset.minimum_notice_hours) {
    throw new Error(`At least ${asset.minimum_notice_hours} hours advance notice required.`);
  }

  // Check for conflicts
  const { data: conflicts } = await supabaseAdmin
    .from("bookings")
    .select("id")
    .eq("asset_id", input.assetId)
    .in("status", ["pending", "confirmed"])
    .lt("start_at", input.endAt)
    .gt("end_at", input.startAt);

  if (conflicts && conflicts.length > 0) {
    throw new Error("This time slot conflicts with an existing booking.");
  }

  // Determine status: anonymous bookings need email verification
  const isAnonymous = !requesterId;
  const verificationToken = isAnonymous
    ? crypto.randomBytes(32).toString("hex")
    : null;
  const verificationExpiresAt = isAnonymous
    ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .insert({
      asset_id: input.assetId,
      requester_id: requesterId,
      contact_name: input.contactName,
      contact_email: input.contactEmail,
      start_at: input.startAt,
      end_at: input.endAt,
      status: isAnonymous ? "pending_verification" : "pending",
      verification_token: verificationToken,
      verification_expires_at: verificationExpiresAt,
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return { booking, asset, isAnonymous, verificationToken };
}

export async function verifyBooking(token: string) {
  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("verification_token", token)
    .eq("status", "pending_verification")
    .single();

  if (error || !booking) throw new Error("Invalid or expired verification link.");

  if (new Date(booking.verification_expires_at) < new Date()) {
    throw new Error("Verification link has expired.");
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("bookings")
    .update({
      status: "pending",
      verification_token: null,
      verification_expires_at: null,
    })
    .eq("id", booking.id)
    .select()
    .single();

  if (updateError) throw new Error(updateError.message);
  return updated;
}

export async function updateBookingStatus(
  bookingId: string,
  ownerId: string,
  status: "confirmed" | "rejected",
) {
  // Verify the booking belongs to an asset owned by this user
  const { data: booking, error: fetchError } = await supabaseAdmin
    .from("bookings")
    .select("*, assets!inner(owner_id)")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) throw new Error("Booking not found.");
  if (booking.assets.owner_id !== ownerId) throw new Error("Access denied.");

  const { data: updated, error } = await supabaseAdmin
    .from("bookings")
    .update({ status })
    .eq("id", bookingId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return updated;
}

// ─── QR Codes ───────────────────────────────────────────────────────────────

export async function createQrCode(
  assetId: string,
  targetType: "asset_booking" | "event_page",
  ownerId: string,
) {
  const token = `q_${crypto.randomBytes(8).toString("hex")}`;

  const { data, error } = await supabaseAdmin
    .from("qr_codes")
    .insert({
      owner_id: ownerId,
      target_type: targetType,
      target_id: assetId,
      token,
      status: "active",
      scan_count: 0,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export async function getAssetOwnerEmail(assetId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("assets")
    .select("owner_id, profiles(id)")
    .eq("id", assetId)
    .single();

  if (!data) return null;

  const { data: user } = await supabaseAdmin.auth.admin.getUserById(data.owner_id);
  return user?.user?.email ?? null;
}

export async function getBookingWithAsset(bookingId: string) {
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("*, assets(title, location, owner_id)")
    .eq("id", bookingId)
    .single();

  if (error) throw new Error("Booking not found.");
  return data;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/thabomollomponya/Dev/scanYa && npm --workspace @scanya/api run typecheck
```

Expected: May still have errors in server.ts due to import changes — we fix those in the next task.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/store.ts
git commit -m "feat(api): rewrite store layer from MongoDB to Supabase Postgres"
```

---

## Task 6: Rewrite Server Routes

**Files:**
- Modify: `apps/api/src/server.ts` (heavy edit)

Remove auth routes, read-only routes, add helmet + rate limiting. Keep only business-logic write routes.

- [ ] **Step 1: Replace server.ts**

Replace the entire contents of `apps/api/src/server.ts` with:

```typescript
import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { attachAuth, requireAuth, requireRole } from "./middleware/auth.js";
import type { AuthenticatedRequest } from "./middleware/auth.js";
import * as store from "./store.js";
import { sendBookingCreatedEmail, sendBookingVerificationEmail, sendBookingStatusEmail } from "./email.js";

const app = express();
const port = Number(process.env.API_PORT ?? 4000);

// ─── Security ───────────────────────────────────────────────────────────────

app.use(helmet());

const allowedOrigins = [
  process.env.APP_BASE_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean) as string[];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin not allowed by CORS."));
    },
  }),
);

app.use(express.json());
app.use(attachAuth);

// Rate limiters
const bookingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many booking requests. Try again in a minute." },
});

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: "Too many requests. Try again in a minute." },
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: "Too many requests. Try again in a minute." },
});

app.use(generalLimiter);

// ─── Validation Schemas ─────────────────────────────────────────────────────

const assetSchema = z.object({
  category: z.string().min(2),
  description: z.string().min(10),
  location: z.string().min(2),
  minimumNoticeHours: z.number().int().min(0),
  minimumRentalHours: z.number().int().min(1),
  priceLabel: z.string().min(2),
  title: z.string().min(3),
});

const bookingSchema = z.object({
  assetId: z.string().min(1),
  contactEmail: z.string().email(),
  contactName: z.string().min(2),
  endAt: z.string().datetime(),
  notes: z.string().optional(),
  startAt: z.string().datetime(),
});

// ─── Routes ─────────────────────────────────────────────────────────────────

app.get("/health", (_request, response) => {
  response.json({ ok: true });
});

// Assets (write operations only — reads go directly to Supabase from frontend)
app.post("/assets", writeLimiter, requireRole("asset_owner"), async (request: AuthenticatedRequest, response) => {
  const result = assetSchema.safeParse(request.body);
  if (!result.success) {
    response.status(400).json({ error: result.error.flatten() });
    return;
  }

  try {
    const asset = await store.createAsset(request.userId!, result.data);
    response.status(201).json({ asset });
  } catch (error) {
    response.status(400).json({ error: (error as Error).message });
  }
});

app.patch("/assets/:id", writeLimiter, requireRole("asset_owner"), async (request: AuthenticatedRequest, response) => {
  const result = assetSchema.partial().safeParse(request.body);
  if (!result.success) {
    response.status(400).json({ error: result.error.flatten() });
    return;
  }

  try {
    const asset = await store.updateAsset(String(request.params.id), request.userId!, result.data);
    response.json({ asset });
  } catch (error) {
    response.status(404).json({ error: (error as Error).message });
  }
});

app.post("/assets/:id/publish", writeLimiter, requireRole("asset_owner"), async (request: AuthenticatedRequest, response) => {
  try {
    const asset = await store.setAssetStatus(String(request.params.id), request.userId!, "published");
    response.json({ asset });
  } catch (error) {
    response.status(404).json({ error: (error as Error).message });
  }
});

app.post("/assets/:id/unpublish", writeLimiter, requireRole("asset_owner"), async (request: AuthenticatedRequest, response) => {
  try {
    const asset = await store.setAssetStatus(String(request.params.id), request.userId!, "draft");
    response.json({ asset });
  } catch (error) {
    response.status(404).json({ error: (error as Error).message });
  }
});

// Bookings
app.post("/bookings", bookingLimiter, async (request: AuthenticatedRequest, response) => {
  const result = bookingSchema.safeParse(request.body);
  if (!result.success) {
    response.status(400).json({ error: result.error.flatten() });
    return;
  }

  try {
    const { booking, asset, isAnonymous, verificationToken } = await store.createBooking(
      request.userId ?? null,
      result.data,
    );

    if (isAnonymous && verificationToken) {
      const verifyUrl = `${process.env.APP_BASE_URL}/bookings/verify/${verificationToken}`;
      await sendBookingVerificationEmail(booking.contact_email, booking.contact_name, asset.title, verifyUrl);
      response.status(201).json({
        booking,
        notification: "Please check your email to confirm this booking.",
      });
    } else {
      const ownerEmail = await store.getAssetOwnerEmail(booking.asset_id);
      if (ownerEmail) {
        await sendBookingCreatedEmail(ownerEmail, asset.title, booking);
      }
      response.status(201).json({
        booking,
        notification: "Booking request received. Owner has been notified.",
      });
    }
  } catch (error) {
    response.status(400).json({ error: (error as Error).message });
  }
});

app.get("/bookings/verify/:token", async (request, response) => {
  try {
    const booking = await store.verifyBooking(String(request.params.token));
    const bookingWithAsset = await store.getBookingWithAsset(booking.id);
    const ownerEmail = await store.getAssetOwnerEmail(booking.asset_id);

    if (ownerEmail) {
      await sendBookingCreatedEmail(ownerEmail, bookingWithAsset.assets.title, booking);
    }

    response.json({ booking, message: "Booking verified. The asset owner has been notified." });
  } catch (error) {
    response.status(400).json({ error: (error as Error).message });
  }
});

app.post("/bookings/:id/confirm", writeLimiter, requireRole("asset_owner"), async (request: AuthenticatedRequest, response) => {
  try {
    const booking = await store.updateBookingStatus(String(request.params.id), request.userId!, "confirmed");
    await sendBookingStatusEmail(booking.contact_email, booking.contact_name, "confirmed");

    response.json({ booking, notification: "Booking confirmed. Requester has been notified." });
  } catch (error) {
    response.status(404).json({ error: (error as Error).message });
  }
});

app.post("/bookings/:id/reject", writeLimiter, requireRole("asset_owner"), async (request: AuthenticatedRequest, response) => {
  try {
    const booking = await store.updateBookingStatus(String(request.params.id), request.userId!, "rejected");
    await sendBookingStatusEmail(booking.contact_email, booking.contact_name, "rejected");

    response.json({ booking, notification: "Booking rejected. Requester has been notified." });
  } catch (error) {
    response.status(404).json({ error: (error as Error).message });
  }
});

// QR Codes
app.post("/assets/:id/qr", writeLimiter, requireRole("asset_owner"), async (request: AuthenticatedRequest, response) => {
  try {
    const qrCode = await store.createQrCode(String(request.params.id), "asset_booking", request.userId!);
    response.status(201).json({ qrCode });
  } catch (error) {
    response.status(400).json({ error: (error as Error).message });
  }
});

// ─── Start ──────────────────────────────────────────────────────────────────

app.listen(port, () => {
  console.log(`scanYa API listening on port ${port}`);
});

export { app };
```

- [ ] **Step 2: Delete the old types.ts if it only contained AuthenticatedRequest**

Check if `apps/api/src/types.ts` exists and what it exports. If it only has `AuthenticatedRequest`, delete it since that type now lives in `middleware/auth.ts`.

```bash
cat apps/api/src/types.ts
```

If it only has the request type, run:
```bash
rm apps/api/src/types.ts
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/thabomollomponya/Dev/scanYa && npm --workspace @scanya/api run typecheck
```

Expected: Will fail because `email.ts` doesn't exist yet — that's Task 7. All other imports should resolve.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/server.ts
git rm apps/api/src/types.ts 2>/dev/null; true
git commit -m "feat(api): rewrite routes — remove reads, add rate limiting + helmet"
```

---

## Task 7: Add Email Notifications (Resend)

**Files:**
- Create: `apps/api/src/email.ts`

- [ ] **Step 1: Create the email module**

Create `apps/api/src/email.ts`:

```typescript
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const fromAddress = process.env.EMAIL_FROM_ADDRESS ?? "bookings@scanya.app";

export async function sendBookingCreatedEmail(
  ownerEmail: string,
  assetTitle: string,
  booking: { contact_name: string; contact_email: string; start_at: string; end_at: string; notes?: string | null },
) {
  const start = new Date(booking.start_at).toLocaleString("en-ZA");
  const end = new Date(booking.end_at).toLocaleString("en-ZA");

  await resend.emails.send({
    from: fromAddress,
    to: ownerEmail,
    subject: `New booking request for ${assetTitle}`,
    text: [
      `You have a new booking request for ${assetTitle}.`,
      ``,
      `Contact: ${booking.contact_name} (${booking.contact_email})`,
      `When: ${start} – ${end}`,
      booking.notes ? `Notes: ${booking.notes}` : "",
      ``,
      `Log in to your dashboard to confirm or reject this booking.`,
    ]
      .filter(Boolean)
      .join("\n"),
  });
}

export async function sendBookingVerificationEmail(
  contactEmail: string,
  contactName: string,
  assetTitle: string,
  verifyUrl: string,
) {
  await resend.emails.send({
    from: fromAddress,
    to: contactEmail,
    subject: `Confirm your booking for ${assetTitle}`,
    text: [
      `Hi ${contactName},`,
      ``,
      `Please confirm your booking request for ${assetTitle} by clicking the link below:`,
      ``,
      verifyUrl,
      ``,
      `This link expires in 24 hours.`,
      ``,
      `If you didn't make this request, you can safely ignore this email.`,
    ].join("\n"),
  });
}

export async function sendBookingStatusEmail(
  contactEmail: string,
  contactName: string,
  status: "confirmed" | "rejected",
) {
  const statusMessage =
    status === "confirmed"
      ? "Your booking has been confirmed! You're all set."
      : "Unfortunately, your booking request has been declined.";

  await resend.emails.send({
    from: fromAddress,
    to: contactEmail,
    subject: `Booking ${status}`,
    text: [
      `Hi ${contactName},`,
      ``,
      statusMessage,
      ``,
      `Visit your bookings page for details.`,
    ].join("\n"),
  });
}
```

- [ ] **Step 2: Verify the full API typechecks**

```bash
cd /Users/thabomollomponya/Dev/scanYa && npm --workspace @scanya/api run typecheck
```

Expected: PASS — all imports now resolve (store, email, middleware/auth).

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/email.ts
git commit -m "feat(api): add Resend email notifications for bookings"
```

---

## Task 8: Migrate Frontend Auth to Supabase

**Files:**
- Modify: `apps/web/src/state/AppContext.js`
- Modify: `apps/web/src/pages/LoginPage.js`

- [ ] **Step 1: Rewrite AppContext auth methods**

In `apps/web/src/state/AppContext.js`, add the Supabase import at the top (after existing imports):

```javascript
import { supabase } from "../lib/supabase";
```

Replace the `signIn` function (lines 106-118) with:

```javascript
async function signIn(event) {
    event.preventDefault();
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: loginForm.email,
            password: loginForm.password,
        });
        if (error) throw error;
        const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", data.user.id)
            .single();
        setSession({
            token: data.session.access_token,
            user: { ...profile, email: data.user.email },
        });
        setMessage(`Signed in as ${profile.name}.`);
        return true;
    } catch (error) {
        setMessage(error.message);
        return false;
    }
}
```

Replace the `signUp` function (lines 119-129) with:

```javascript
async function signUp(event) {
    event.preventDefault();
    try {
        const { error } = await supabase.auth.signUp({
            email: registerForm.email,
            password: registerForm.password,
            options: {
                data: {
                    role: registerForm.role,
                    name: registerForm.name,
                    company: registerForm.company,
                },
            },
        });
        if (error) throw error;
        setMessage("Account created. Sign in with the same credentials.");
        setLoginForm({ email: registerForm.email, password: registerForm.password });
    } catch (error) {
        setMessage(error.message);
    }
}
```

Replace the `signOut` function (lines 211-214) with:

```javascript
async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setMessage("Signed out.");
}
```

- [ ] **Step 2: Add session persistence via Supabase auth listener**

In `apps/web/src/state/AppContext.js`, add a new useEffect after the existing ones (after line 68):

```javascript
useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: supaSession } }) => {
        if (supaSession) {
            supabase
                .from("profiles")
                .select("*")
                .eq("id", supaSession.user.id)
                .single()
                .then(({ data: profile }) => {
                    if (profile) {
                        setSession({
                            token: supaSession.access_token,
                            user: { ...profile, email: supaSession.user.email },
                        });
                    }
                });
        }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, supaSession) => {
            if (event === "SIGNED_OUT" || !supaSession) {
                setSession(null);
                return;
            }
            const { data: profile } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", supaSession.user.id)
                .single();
            if (profile) {
                setSession({
                    token: supaSession.access_token,
                    user: { ...profile, email: supaSession.user.email },
                });
            }
        },
    );

    return () => subscription.unsubscribe();
}, []);
```

- [ ] **Step 3: Replace hydrateSession to use Supabase directly**

Replace `hydrateSession` (lines 88-105) with:

```javascript
async function hydrateSession(nextSession) {
    try {
        const { data: myBookings } = await supabase
            .from("bookings")
            .select("*, assets(title)")
            .eq("requester_id", nextSession.user.id);
        setBookings(myBookings ?? []);

        if (nextSession.user.role === "asset_owner") {
            const { data: owned } = await supabase
                .from("bookings")
                .select("*, assets!inner(title, owner_id)")
                .eq("assets.owner_id", nextSession.user.id);
            setOwnerBookings(owned ?? []);
        } else {
            setOwnerBookings([]);
        }
    } catch (error) {
        setMessage(error.message);
    }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/state/AppContext.js apps/web/src/pages/LoginPage.js
git commit -m "feat(web): migrate auth to Supabase with session persistence"
```

---

## Task 9: Migrate Frontend Reads to Supabase Direct

**Files:**
- Modify: `apps/web/src/state/AppContext.js`
- Modify: `apps/web/src/api.js`

- [ ] **Step 1: Replace read functions in AppContext to use Supabase**

Replace `refreshAssets` (lines 69-77) with:

```javascript
async function refreshAssets() {
    try {
        const { data, error } = await supabase
            .from("assets")
            .select("*")
            .eq("status", "published");
        if (error) throw error;
        setAssets(data);
    } catch (error) {
        setMessage(error.message);
    }
}
```

Replace `loadAvailability` (lines 78-87) with:

```javascript
async function loadAvailability(assetId, date) {
    try {
        const dayOfWeek = new Date(date).getDay();
        const { data: rules } = await supabase
            .from("asset_availability_rules")
            .select("*")
            .eq("asset_id", assetId)
            .eq("day_of_week", dayOfWeek);

        const dayStart = `${date}T00:00:00.000Z`;
        const dayEnd = `${date}T23:59:59.999Z`;
        const { data: dayBookings } = await supabase
            .from("bookings")
            .select("*")
            .eq("asset_id", assetId)
            .in("status", ["pending", "confirmed"])
            .gte("start_at", dayStart)
            .lte("start_at", dayEnd);

        setAvailability({
            assetId,
            date,
            windows: (rules ?? []).map((r) => ({
                startHour: r.start_hour,
                endHour: r.end_hour,
            })),
            bookings: dayBookings ?? [],
        });
    } catch (error) {
        setAvailability(null);
        setMessage(error.message);
    }
}
```

Replace `loadMonthAvailability` (lines 182-190) with:

```javascript
const loadMonthAvailability = useCallback(async (assetId, month) => {
    try {
        const { data: rules } = await supabase
            .from("asset_availability_rules")
            .select("*")
            .eq("asset_id", assetId);

        const [year, mo] = month.split("-").map(Number);
        const daysInMonth = new Date(year, mo, 0).getDate();
        const monthStart = `${month}-01T00:00:00.000Z`;
        const monthEnd = `${month}-${String(daysInMonth).padStart(2, "0")}T23:59:59.999Z`;

        const { data: monthBookings } = await supabase
            .from("bookings")
            .select("*")
            .eq("asset_id", assetId)
            .in("status", ["pending", "confirmed"])
            .gte("start_at", monthStart)
            .lte("start_at", monthEnd);

        const days = {};
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${month}-${String(d).padStart(2, "0")}`;
            const dayOfWeek = new Date(dateStr).getDay();
            const dayRules = (rules ?? []).filter((r) => r.day_of_week === dayOfWeek);
            const dayBk = (monthBookings ?? []).filter(
                (b) => b.start_at.slice(0, 10) === dateStr
            );
            days[dateStr] = {
                totalWindowHours: dayRules.reduce((sum, r) => sum + (r.end_hour - r.start_hour), 0),
                bookedHours: dayBk.reduce((sum, b) => {
                    const s = new Date(b.start_at);
                    const e = new Date(b.end_at);
                    return sum + (e - s) / (1000 * 60 * 60);
                }, 0),
                hasAvailability: dayRules.length > 0,
            };
        }
        setMonthAvailability({ assetId, month, days });
    } catch (error) {
        setMessage(error.message);
    }
}, []);
```

- [ ] **Step 2: Slim down api.js — keep only write operations**

Replace the entire contents of `apps/web/src/api.js` with:

```javascript
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

async function request(path, options = {}, token) {
    const response = await fetch(`${apiBaseUrl}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers ?? {}),
        },
    });
    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload.error ?? "Request failed.");
    }
    return payload;
}

export const api = {
    // Assets (writes only — reads go through Supabase client)
    createAsset(token, input) {
        return request("/assets", {
            method: "POST",
            body: JSON.stringify(input),
        }, token);
    },
    updateAsset(token, assetId, input) {
        return request(`/assets/${assetId}`, {
            method: "PATCH",
            body: JSON.stringify(input),
        }, token);
    },
    publishAsset(token, assetId) {
        return request(`/assets/${assetId}/publish`, { method: "POST" }, token);
    },
    unpublishAsset(token, assetId) {
        return request(`/assets/${assetId}/unpublish`, { method: "POST" }, token);
    },

    // Bookings (writes only)
    createBooking(token, input) {
        return request("/bookings", {
            method: "POST",
            body: JSON.stringify(input),
        }, token);
    },
    createAnonymousBooking(input) {
        return request("/bookings", {
            method: "POST",
            body: JSON.stringify(input),
        });
    },
    confirmBooking(token, bookingId) {
        return request(`/bookings/${bookingId}/confirm`, { method: "POST" }, token);
    },
    rejectBooking(token, bookingId) {
        return request(`/bookings/${bookingId}/reject`, { method: "POST" }, token);
    },

    // QR (writes only)
    createQrCode(token, assetId) {
        return request(`/assets/${assetId}/qr`, { method: "POST" }, token);
    },
};
```

- [ ] **Step 3: Update AppContext methods that use api.js for writes**

In `apps/web/src/state/AppContext.js`, update `createBooking` (lines 130-146) — the api call stays the same but uses the token from session:

```javascript
async function createBooking(event, assetId) {
    event.preventDefault();
    if (!session) {
        setMessage("Sign in before creating a booking.");
        return;
    }
    try {
        const response = await api.createBooking(session.token, { assetId, ...bookingForm });
        setMessage(response.notification);
        // Refresh bookings from Supabase
        const { data: myBookings } = await supabase
            .from("bookings")
            .select("*, assets(title)")
            .eq("requester_id", session.user.id);
        setBookings(myBookings ?? []);
        await loadAvailability(assetId, selectedDate);
    } catch (error) {
        setMessage(error.message);
    }
}
```

Update `createAnonymousBooking` (lines 191-210) — same api call, no change needed to the function body since it already uses `api.createAnonymousBooking`.

Update `updateBookingDecision` (lines 163-181) to refresh from Supabase:

```javascript
async function updateBookingDecision(bookingId, action) {
    if (!session) return;
    try {
        if (action === "confirm") {
            await api.confirmBooking(session.token, bookingId);
        } else {
            await api.rejectBooking(session.token, bookingId);
        }
        // Refresh owner bookings from Supabase
        const { data: owned } = await supabase
            .from("bookings")
            .select("*, assets!inner(title, owner_id)")
            .eq("assets.owner_id", session.user.id);
        setOwnerBookings(owned ?? []);
        setMessage(`Booking ${action}ed.`);
    } catch (error) {
        setMessage(error.message);
    }
}
```

- [ ] **Step 4: Update AppContext for QR reads via Supabase**

If `WorkspaceQrPage.js` currently calls `api.listMyQrCodes()`, update the relevant function to use Supabase directly. The QR page likely calls this from AppContext or directly. For now, add a helper in AppContext or update the page to query Supabase:

In the relevant workspace page that loads QR codes, replace the `api.listMyQrCodes(token)` call with:

```javascript
const { data: qrCodes } = await supabase
    .from("qr_codes")
    .select("*")
    .eq("owner_id", session.user.id);
```

Similarly for `api.resolveQr(token)`:

```javascript
const { data: qrCode } = await supabase
    .from("qr_codes")
    .select("*")
    .eq("token", token)
    .eq("status", "active")
    .single();
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/state/AppContext.js apps/web/src/api.js
git commit -m "feat(web): migrate reads to Supabase direct, slim api.js to writes only"
```

---

## Task 10: Add Booking Verification Route to Frontend

**Files:**
- Modify: `apps/web/src/App.js`

The anonymous booking verification link (`/bookings/verify/:token`) hits the API, but the user lands on a frontend URL first. We need a simple page that calls the API verification endpoint and shows the result.

- [ ] **Step 1: Create a minimal verification page component**

Create `apps/web/src/pages/BookingVerifyPage.js`:

```javascript
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export function BookingVerifyPage() {
    const { token } = useParams();
    const [status, setStatus] = useState("verifying");
    const [message, setMessage] = useState("Verifying your booking...");

    useEffect(() => {
        fetch(`${apiBaseUrl}/bookings/verify/${token}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.error) {
                    setStatus("error");
                    setMessage(data.error);
                } else {
                    setStatus("success");
                    setMessage(data.message);
                }
            })
            .catch(() => {
                setStatus("error");
                setMessage("Something went wrong. Please try again.");
            });
    }, [token]);

    return _jsx("div", {
        className: "login-page",
        children: _jsxs("div", {
            className: "login-card",
            style: { textAlign: "center" },
            children: [
                _jsx("h2", { className: "login-title", children: status === "verifying" ? "Verifying..." : status === "success" ? "Booking Confirmed" : "Verification Failed" }),
                _jsx("p", { style: { marginTop: 16 }, children: message }),
            ],
        }),
    });
}
```

- [ ] **Step 2: Add the route to App.js**

In `apps/web/src/App.js`, add the import:

```javascript
import { BookingVerifyPage } from "./pages/BookingVerifyPage";
```

Add the route inside the public `<Routes>` block (alongside the other public routes):

```javascript
_jsx(Route, { path: "/bookings/verify/:token", element: _jsx(BookingVerifyPage, {}) })
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/BookingVerifyPage.js apps/web/src/App.js
git commit -m "feat(web): add booking email verification page"
```

---

## Task 11: Clean Up and Remove MongoDB References

**Files:**
- Modify: `apps/api/src/bootstrap.ts`
- Delete: old MongoDB-related code

- [ ] **Step 1: Simplify bootstrap.ts**

The `bootstrap.ts` still calls `initializeStore()` which no longer exists. Replace its contents with:

```typescript
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);

const candidateRoots = new Set<string>();

for (const baseDir of [process.cwd(), currentDir]) {
  let cursor = path.resolve(baseDir);

  while (true) {
    candidateRoots.add(cursor);
    const parent = path.dirname(cursor);

    if (parent === cursor) {
      break;
    }

    cursor = parent;
  }
}

for (const root of candidateRoots) {
  config({ path: path.join(root, ".env"), override: false });
  config({ path: path.join(root, "apps/api/.env"), override: false });
}

await import("./server.js");
```

(This is essentially the same file — just ensure `initializeStore()` isn't called anywhere.)

- [ ] **Step 2: Remove the old store.ts import in server.ts for initializeStore**

Check `apps/api/src/server.ts` — ensure it does NOT call `initializeStore()` or `store.seedIfEmpty()`. The new server.ts from Task 6 already handles this correctly.

- [ ] **Step 3: Remove the old db/schema.sql (superseded by migrations)**

```bash
rm db/schema.sql
```

- [ ] **Step 4: Verify full API build**

```bash
cd /Users/thabomollomponya/Dev/scanYa && npm --workspace @scanya/api run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/bootstrap.ts
git rm db/schema.sql
git commit -m "chore: clean up MongoDB references and old schema file"
```

---

## Task 12: Update Environment and Verify End-to-End

**Files:**
- Modify: `.env` (local)

- [ ] **Step 1: Update local .env with Supabase credentials**

Add to your `.env` (get values from Supabase dashboard → Settings → API):

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
RESEND_API_KEY=re_your_key
EMAIL_FROM_ADDRESS=bookings@yourdomain.com
```

Remove old MongoDB vars:
```
# Remove these:
# MONGODB_URI=...
# MONGODB_DB_NAME=...
# SESSION_SECRET=...
```

- [ ] **Step 2: Start the API and verify health endpoint**

```bash
cd /Users/thabomollomponya/Dev/scanYa && npm run dev:api
```

Open another terminal:
```bash
curl http://localhost:4000/health
```

Expected: `{"ok":true}`

- [ ] **Step 3: Start the web app and verify auth flow**

```bash
npm run dev:web
```

Open `http://localhost:5173` in browser. Test:
1. Navigate to `/app/login` — login form should appear
2. Sign up a new user via the register form
3. Sign in with the new user
4. Refresh the page — session should persist (this was broken before!)
5. Sign out — session should clear

- [ ] **Step 4: Test booking flow**

1. Browse public assets at `/assets`
2. Click an asset → see calendar
3. Select a time slot → submit anonymous booking
4. Check email for verification link
5. Click verification link → booking moves to pending
6. Log in as asset owner → see pending booking in dashboard
7. Confirm the booking → check requester email for confirmation

- [ ] **Step 5: Final commit**

```bash
git add .env.example
git commit -m "chore: finalize environment config for Supabase migration"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Auth migration (Supabase Auth) — Tasks 3, 4, 8
- [x] Database migration (Postgres + RLS) — Tasks 1, 5
- [x] API simplification — Tasks 6, 11
- [x] Email notifications (Resend) — Task 7
- [x] Anonymous booking verification — Tasks 5, 6, 10
- [x] Rate limiting + security headers — Task 6
- [x] CORS tightening — Task 6
- [x] Session persistence — Task 8
- [x] Booking verification route — Task 10
- [x] Environment variable updates — Tasks 1, 12

**Placeholder scan:** No TBDs, TODOs, or "implement later" found.

**Type consistency:** `AuthenticatedRequest` defined in `middleware/auth.ts`, used consistently in `server.ts`. Store exports match server imports. Email function signatures match call sites in server.ts.
