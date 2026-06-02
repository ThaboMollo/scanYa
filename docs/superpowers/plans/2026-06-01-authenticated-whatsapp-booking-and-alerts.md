# Authenticated WhatsApp Booking and System Alerts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the public browse published assets, authenticate only when they start a booking, persist a pending booking, then hand off to the asset owner via a prefilled WhatsApp message — with global system alerts throughout.

**Architecture:** The web app (React 19 + Vite + react-router 7) *reads* directly from Supabase with the anon key under RLS, and *writes* through the Express API which uses the Supabase service-role key (bypassing RLS). WhatsApp numbers are private: they live on `profiles.whatsapp_number`, are unreadable by the anon client (the permissive public-profile RLS policy is dropped), and are exposed only through an authenticated API endpoint for published assets. The booking handoff opens `https://wa.me/<number>?text=<message>` after the booking row is persisted.

**Tech Stack:** TypeScript, React 19, react-router-dom 7, Express, Zod, Supabase (`@supabase/supabase-js`), Vitest (new, for pure helpers).

---

## Critical Repo Conventions (read before coding)

1. **The web app ships committed compiled `.js`.** `apps/web/index.html` loads `/src/main.js`, and `tsc -p apps/web/tsconfig.json` emits a `.js` next to every `.ts`/`.tsx` (e.g. `api.ts` → `api.js`, `vite.config.ts` → `vite.config.js`). **After every web source edit you MUST regenerate and commit the matching `.js`.** The canonical command is:

   ```bash
   cd apps/web && npx tsc -p tsconfig.json
   ```

   This both type-checks (errors fail the build) **and** emits the `.js`. Run it as the verification step for every web task, then `git add` both the `.ts`/`.tsx` and its `.js`.

2. **The API does NOT commit `.js`.** It runs via `tsx` in dev and builds to `dist/` for deploy. For API tasks, edit only `.ts` and verify with:

   ```bash
   npm run typecheck -w @scanya/api
   ```

3. **`@scanya/shared` is type-only** (all exports are `type`). `apps/web/tsconfig.json` extends `tsconfig.base.json` whose `paths` maps `@scanya/shared` → `packages/shared/src/index.ts`, so tsc sees type edits immediately. Runtime never needs the types (erased). **No `packages/shared` rebuild is required.**

4. **Data-flow rule for new code:** owner-private data (WhatsApp numbers) is served only by the API (service role). Owner-self writes that RLS already permits (updating your own profile) may go directly through the web Supabase client. All booking inserts go through the API.

5. **Verification reality:** there is no integration test harness. Per-task verification = `tsc` (typecheck + emit) for web, `typecheck` for API, `vitest` for the pure helpers, and the manual browser steps noted in the final task. Do not stand up supertest/test-DB infra — out of scope.

---

## File Structure

**Created:**
- `db/migrations/002_whatsapp_and_booking_location.sql` — schema + RLS changes.
- `apps/web/src/lib/whatsapp.ts` — pure helpers: `normalizeWhatsappNumber`, `formatDateTime`, `buildWhatsappMessage`, `buildWhatsappUrl`.
- `apps/web/src/lib/whatsapp.test.ts` — Vitest unit tests for the helpers.
- `apps/web/src/components/AlertStack.tsx` — renders global system alerts.
- `apps/web/src/styles/alerts.css` — alert styling.
- `apps/web/vitest.config.ts` — Vitest config.

**Modified:**
- `packages/shared/src/index.ts` — `PublicUser.whatsappNumber`, `Booking.location`, new `AssetBookingDetails`.
- `apps/web/src/lib/dbMappers.ts` — map `whatsapp_number`, `location`.
- `apps/web/src/state/AppContext.tsx` — alerts API, booking-details + `submitBooking`, `location` in booking form, profile whatsapp in `mapAuthUser`, alert-ify status/error paths.
- `apps/web/src/App.tsx` — import alerts.css, mount `<AlertStack/>`.
- `apps/web/src/pages/ProfilePage.tsx` — WhatsApp field + save.
- `apps/web/src/pages/LoginPage.tsx` — honor `?redirect=`.
- `apps/web/src/pages/AssetDetailPage.tsx` — restore pending booking after login.
- `apps/web/src/components/DayTimeline.tsx` — auth gate on "Continue".
- `apps/web/src/components/ContactForm.tsx` — authed prefill + `location` + WhatsApp submit.
- `apps/web/src/api.ts` — `getAssetBookingDetails`, `location` in booking inputs, `whatsappNumber` in `updateMe` type.
- `apps/api/src/server.ts` — booking `location` in schema, `GET /assets/:id/booking-details`.
- `apps/api/src/store.ts` — `location` insert, `getAssetBookingDetails`, publish-time WhatsApp guard.
- `apps/web/package.json` — vitest devDep + `test` script.
- `apps/web/tsconfig.json` — exclude `*.test.ts` from emit.

---

## Task 0: Project setup — Vitest + pure WhatsApp helpers (TDD)

**Files:**
- Create: `apps/web/vitest.config.ts`
- Modify: `apps/web/package.json`, `apps/web/tsconfig.json`
- Create: `apps/web/src/lib/whatsapp.test.ts`
- Create: `apps/web/src/lib/whatsapp.ts`
- Create: `apps/web/src/styles/alerts.css`

- [ ] **Step 1: Add Vitest devDependency and test script**

Edit `apps/web/package.json` — add `"test": "vitest run"` and `"test:watch": "vitest"` to `scripts`, and `"vitest": "^3.0.0"` to `devDependencies`. Then install:

```bash
npm install
```

- [ ] **Step 2: Create Vitest config**

Create `apps/web/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 3: Exclude test files from the tsc emit**

Edit `apps/web/tsconfig.json` so test files are not emitted as committed `.js`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "types": ["vite/client"]
  },
  "include": ["src", "vite.config.ts"],
  "exclude": ["src/**/*.test.ts"]
}
```

- [ ] **Step 4: Write the failing helper tests**

Create `apps/web/src/lib/whatsapp.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  buildWhatsappMessage,
  buildWhatsappUrl,
  formatDateTime,
  normalizeWhatsappNumber,
} from "./whatsapp";

describe("normalizeWhatsappNumber", () => {
  it("strips spaces, plus, and punctuation", () => {
    expect(normalizeWhatsappNumber("+27 82 123 4567")).toBe("27821234567");
  });

  it("converts a South African leading zero to the 27 country code", () => {
    expect(normalizeWhatsappNumber("082 123 4567")).toBe("27821234567");
  });

  it("leaves an already-international number unchanged", () => {
    expect(normalizeWhatsappNumber("27821234567")).toBe("27821234567");
  });

  it("returns an empty string for empty input", () => {
    expect(normalizeWhatsappNumber("")).toBe("");
  });
});

describe("formatDateTime", () => {
  it("formats an ISO string as a readable UTC date and time", () => {
    expect(formatDateTime("2026-06-02T10:00:00.000Z")).toBe("2 Jun 2026, 10:00");
  });
});

describe("buildWhatsappMessage", () => {
  it("includes who, where, when, title, and reference, omitting empty notes", () => {
    const message = buildWhatsappMessage({
      assetTitle: "Mobile Fridge",
      contactName: "Thabo",
      contactEmail: "thabo@example.com",
      location: "Soweto",
      startAt: "2026-06-02T10:00:00.000Z",
      endAt: "2026-06-02T16:00:00.000Z",
      bookingId: "abc-123",
      notes: "",
    });

    expect(message).toContain("Hi, I would like to book Mobile Fridge.");
    expect(message).toContain("Who: Thabo");
    expect(message).toContain("Email: thabo@example.com");
    expect(message).toContain("Where: Soweto");
    expect(message).toContain("When: 2 Jun 2026, 10:00 to 2 Jun 2026, 16:00");
    expect(message).toContain("Booking reference: abc-123");
    expect(message).not.toContain("Notes:");
  });

  it("appends notes when present", () => {
    const message = buildWhatsappMessage({
      assetTitle: "Mobile Fridge",
      contactName: "Thabo",
      contactEmail: "thabo@example.com",
      location: "Soweto",
      startAt: "2026-06-02T10:00:00.000Z",
      endAt: "2026-06-02T16:00:00.000Z",
      bookingId: "abc-123",
      notes: "Need it cold by 9am",
    });

    expect(message).toContain("Notes: Need it cold by 9am");
  });
});

describe("buildWhatsappUrl", () => {
  it("builds a wa.me url with the encoded message", () => {
    const url = buildWhatsappUrl("27821234567", "Hi there");
    expect(url).toBe("https://wa.me/27821234567?text=Hi%20there");
  });
});
```

- [ ] **Step 5: Run the tests to verify they fail**

Run: `npm run test -w @scanya/web`
Expected: FAIL — `Cannot find module './whatsapp'` (file not created yet).

- [ ] **Step 6: Implement the helpers**

Create `apps/web/src/lib/whatsapp.ts`:

```ts
export function normalizeWhatsappNumber(value: string): string {
  const digits = value.replace(/[^\d]/g, "");

  if (digits.startsWith("0")) {
    return `27${digits.slice(1)}`;
  }

  return digits;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

type WhatsappMessageInput = {
  assetTitle: string;
  contactName: string;
  contactEmail: string;
  location: string;
  startAt: string;
  endAt: string;
  bookingId: string;
  notes?: string;
};

export function buildWhatsappMessage(input: WhatsappMessageInput): string {
  return [
    `Hi, I would like to book ${input.assetTitle}.`,
    "",
    `Who: ${input.contactName}`,
    `Email: ${input.contactEmail}`,
    `Where: ${input.location}`,
    `When: ${formatDateTime(input.startAt)} to ${formatDateTime(input.endAt)}`,
    "",
    `Booking reference: ${input.bookingId}`,
    input.notes ? `Notes: ${input.notes}` : null,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

export function buildWhatsappUrl(whatsappNumber: string, message: string): string {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}
```

> Note: `en-GB` `toLocaleString` renders `"2 Jun 2026, 10:00"`. If the runtime ICU data formats differently and the test fails, adjust the test's expected string to the actual output — the helper, not the test literal, is the source of truth.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm run test -w @scanya/web`
Expected: PASS (all helper tests green).

- [ ] **Step 8: Create the alerts stylesheet**

Create `apps/web/src/styles/alerts.css`:

```css
.alert-stack {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: min(360px, calc(100vw - 32px));
}

.alert {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 14px;
  line-height: 1.35;
  color: #fff;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
  animation: alert-in 160ms ease-out;
}

.alert--success { background: #16a34a; }
.alert--error { background: #dc2626; }
.alert--warning { background: #d97706; }
.alert--info { background: #2563eb; }

.alert-message { flex: 1; }

.alert-dismiss {
  background: transparent;
  border: none;
  color: inherit;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  opacity: 0.85;
}

.alert-dismiss:hover { opacity: 1; }

@keyframes alert-in {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 9: Emit web `.js` and commit**

```bash
cd apps/web && npx tsc -p tsconfig.json
cd ../.. && git add apps/web/package.json apps/web/package-lock.json apps/web/vitest.config.ts apps/web/tsconfig.json apps/web/src/lib/whatsapp.ts apps/web/src/lib/whatsapp.js apps/web/src/lib/whatsapp.test.ts apps/web/src/styles/alerts.css
git commit -m "feat(web): add vitest, whatsapp pure helpers, and alert styles"
```

> The repo's `package-lock.json` may live at the repo root rather than `apps/web`. `git add` whichever lockfile changed.

---

## Task 1: Database migration

**Files:**
- Create: `db/migrations/002_whatsapp_and_booking_location.sql`

- [ ] **Step 1: Write the migration**

Create `db/migrations/002_whatsapp_and_booking_location.sql`:

```sql
-- WhatsApp booking + system alerts feature

-- 1. Owner WhatsApp number (international digits-only, e.g. 27821234567)
alter table public.profiles
  add column if not exists whatsapp_number varchar(32);

-- 2. Booking location ("where the asset is needed")
alter table public.bookings
  add column if not exists location text;

-- 3. Allow super_admin role (the original CHECK omitted it)
alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('super_admin', 'asset_owner', 'event_organizer', 'attendee'));

-- 4. Privacy: stop the anon client reading whole profile rows.
--    WhatsApp numbers must never be readable by the public.
--    Owner-self reads remain via "Users read own profile"; public booking
--    contact details are served only by the authenticated API (service role).
drop policy if exists "Public reads profile name" on public.profiles;

-- 5. Tighten booking inserts. All booking inserts already go through the API
--    using the service-role key (which bypasses RLS), so this only removes the
--    unused public direct-insert path.
drop policy if exists "Anyone creates bookings" on public.bookings;
create policy "Authenticated users create bookings"
  on public.bookings for insert
  to authenticated
  with check (auth.uid() = requester_id);
```

- [ ] **Step 2: Apply the migration**

Run it against the Supabase project (SQL editor or `psql` with the project connection string). There is no automated migration runner in this repo; migrations are applied manually.

Verify in the Supabase SQL editor:

```sql
select column_name from information_schema.columns
where table_name = 'profiles' and column_name = 'whatsapp_number';
select column_name from information_schema.columns
where table_name = 'bookings' and column_name = 'location';
```

Expected: each query returns one row.

- [ ] **Step 3: Sanity-check the privacy change**

In the Supabase SQL editor or via an anon-key client, confirm an unauthenticated `select whatsapp_number from profiles` returns **no rows** (policy dropped). Confirm a logged-in user can still read their own profile.

- [ ] **Step 4: Commit**

```bash
git add db/migrations/002_whatsapp_and_booking_location.sql
git commit -m "feat(db): add whatsapp_number, booking location, and tighten profile/booking RLS"
```

---

## Task 2: Shared types and DB mappers

**Files:**
- Modify: `packages/shared/src/index.ts`
- Modify: `apps/web/src/lib/dbMappers.ts`

- [ ] **Step 1: Add `whatsappNumber` to `User`/`PublicUser`**

In `packages/shared/src/index.ts`, add `whatsappNumber` to the `User` type (so `PublicUser = Omit<User, "password">` inherits it):

```ts
export type User = {
  id: string;
  company: string;
  createdAt: string;
  email: string;
  lastLoginAt: string | null;
  name: string;
  password: string;
  role: UserRole;
  whatsappNumber: string | null;
};
```

- [ ] **Step 2: Add `location` to `Booking`**

In the same file, add `location` to `Booking`:

```ts
export type Booking = {
  id: string;
  assetId: string;
  contactEmail: string;
  contactName: string;
  createdAt: string;
  endAt: string;
  location: string;
  notes: string;
  requesterId: string | null;
  startAt: string;
  status: BookingStatus;
};
```

- [ ] **Step 3: Add the `AssetBookingDetails` type**

Append to `packages/shared/src/index.ts`:

```ts
export type AssetBookingDetails = {
  asset: { id: string; title: string };
  owner: { name: string; whatsappNumber: string | null };
};
```

- [ ] **Step 4: Map the new columns**

In `apps/web/src/lib/dbMappers.ts`, update `mapProfile` and `mapBooking`:

```ts
export function mapProfile(row: DbRow, email = ""): PublicUser {
  return {
    id: row.id,
    company: row.company ?? "",
    createdAt: row.created_at ?? "",
    email,
    lastLoginAt: null,
    name: row.name ?? "",
    role: row.role,
    whatsappNumber: row.whatsapp_number ?? null,
  };
}
```

```ts
export function mapBooking(row: DbRow): Booking {
  return {
    id: row.id,
    assetId: row.asset_id,
    contactEmail: row.contact_email,
    contactName: row.contact_name,
    createdAt: row.created_at,
    endAt: row.end_at,
    location: row.location ?? "",
    notes: row.notes ?? "",
    requesterId: row.requester_id,
    startAt: row.start_at,
    status: row.status,
  };
}
```

- [ ] **Step 5: Typecheck + emit**

```bash
cd apps/web && npx tsc -p tsconfig.json
```

Expected: fails with errors in `AppContext.tsx` `mapAuthUser` (the inline object literal is missing `whatsappNumber`). That is fixed in Task 3, Step 2. If you are running tasks out of order, add `whatsappNumber: null` to that literal now. Otherwise proceed to Task 3 and emit/commit there.

> Because `mapAuthUser` returns `PublicUser`, the new required `whatsappNumber` field forces that fix. This is expected and caught by tsc.

- [ ] **Step 6: Commit (after Task 3 makes it compile, or stage together)**

```bash
git add packages/shared/src/index.ts apps/web/src/lib/dbMappers.ts apps/web/src/lib/dbMappers.js
git commit -m "feat(shared): add whatsappNumber, booking location, and AssetBookingDetails types"
```

---

## Task 3: System alerts in AppContext + AlertStack

**Files:**
- Modify: `apps/web/src/state/AppContext.tsx`
- Create: `apps/web/src/components/AlertStack.tsx`
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Add the alert type and state to AppContext**

In `apps/web/src/state/AppContext.tsx`, add a `SystemAlert` type near the other type declarations (after the imports / before `AppContextValue`):

```ts
type SystemAlert = {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  createdAt: string;
};
```

Add to the `AppContextValue` type (alongside `message`):

```ts
  alerts: SystemAlert[];
  pushAlert: (type: SystemAlert["type"], message: string) => void;
  dismissAlert: (id: string) => void;
  clearAlerts: () => void;
```

- [ ] **Step 2: Fix `mapAuthUser` for the new required field**

In `mapAuthUser`, add `whatsappNumber` to the metadata fallback object:

```ts
  return {
    id: user.id,
    company: metadata.company ?? "",
    createdAt: user.created_at ?? "",
    email: user.email ?? "",
    lastLoginAt: null,
    name: metadata.name ?? user.email ?? "User",
    role: metadata.role ?? "attendee",
    whatsappNumber: metadata.whatsapp_number ?? null,
  };
```

- [ ] **Step 3: Implement alert state + handlers in `AppProvider`**

Add state near the other `useState` calls (e.g. after the `message` state):

```ts
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
```

Add handlers (place them before the `value` `useMemo`, near `clearMessage`):

```ts
  const dismissAlert = useCallback((id: string) => {
    setAlerts((current) => current.filter((alert) => alert.id !== id));
  }, []);

  const pushAlert = useCallback((type: SystemAlert["type"], message: string) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    setAlerts((current) => [
      ...current,
      { id, type, message, createdAt: new Date().toISOString() },
    ]);

    if (type === "success" || type === "info") {
      setTimeout(() => {
        setAlerts((current) => current.filter((alert) => alert.id !== id));
      }, 5000);
    }
  }, []);

  const clearAlerts = useCallback(() => setAlerts([]), []);
```

- [ ] **Step 4: Expose the alert API in the context value**

In the `value` `useMemo` object, add the four members:

```ts
      alerts,
      pushAlert,
      dismissAlert,
      clearAlerts,
```

And add `alerts`, `pushAlert`, `dismissAlert`, `clearAlerts` to the `useMemo` dependency array.

- [ ] **Step 5: Create the AlertStack component**

Create `apps/web/src/components/AlertStack.tsx`:

```tsx
import { useAppState } from "../state/AppContext";

export function AlertStack() {
  const { alerts, dismissAlert } = useAppState();

  if (alerts.length === 0) return null;

  return (
    <div className="alert-stack" role="status" aria-live="polite">
      {alerts.map((alert) => (
        <div key={alert.id} className={`alert alert--${alert.type}`}>
          <span className="alert-message">{alert.message}</span>
          <button
            type="button"
            className="alert-dismiss"
            aria-label="Dismiss alert"
            onClick={() => dismissAlert(alert.id)}
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Mount AlertStack globally in App**

In `apps/web/src/App.tsx`, add the alerts stylesheet import and render `<AlertStack/>` inside the provider so it shows on public, login, and workspace routes:

```tsx
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider } from "./state/AppContext";
import { AlertStack } from "./components/AlertStack";
import { PublicLayout } from "./layouts/PublicLayout";
// ... existing imports ...
import "./styles/global.css";
import "./styles/public.css";
import "./styles/workspace.css";
import "./styles/calendar.css";
import "./styles/alerts.css";
```

```tsx
export function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AlertStack />
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}
```

- [ ] **Step 7: Typecheck + emit**

```bash
cd apps/web && npx tsc -p tsconfig.json
```

Expected: PASS (no type errors).

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/state/AppContext.tsx apps/web/src/state/AppContext.js \
  apps/web/src/components/AlertStack.tsx apps/web/src/components/AlertStack.js \
  apps/web/src/App.tsx apps/web/src/App.js \
  packages/shared/src/index.ts apps/web/src/lib/dbMappers.ts apps/web/src/lib/dbMappers.js
git commit -m "feat(web): add global system alerts and surface profile whatsapp in session"
```

> This commit also lands the Task 2 type/mapper changes that `mapAuthUser` depends on.

---

## Task 4: Profile WhatsApp editing

**Files:**
- Modify: `apps/web/src/pages/ProfilePage.tsx`

- [ ] **Step 1: Rebuild ProfilePage with an editable WhatsApp field**

Replace `apps/web/src/pages/ProfilePage.tsx` with:

```tsx
import { useState } from "react";
import { useAppState } from "../state/AppContext";
import { supabase } from "../lib/supabase";
import { normalizeWhatsappNumber } from "../lib/whatsapp";

export function ProfilePage() {
  const { session, setSession, signOut, pushAlert } = useAppState();
  const [whatsapp, setWhatsapp] = useState(session?.user.whatsappNumber ?? "");
  const [saving, setSaving] = useState(false);

  if (!session) return null;

  const handleSave = async () => {
    const normalized = normalizeWhatsappNumber(whatsapp);
    if (!normalized) {
      pushAlert("warning", "Enter a valid WhatsApp number.");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ whatsapp_number: normalized })
      .eq("id", session.user.id);
    setSaving(false);

    if (error) {
      pushAlert("error", error.message);
      return;
    }

    setWhatsapp(normalized);
    setSession({
      ...session,
      user: { ...session.user, whatsappNumber: normalized },
    });
    pushAlert("success", "WhatsApp number saved.");
  };

  return (
    <div>
      <h1 className="section-title" style={{ fontSize: 22, marginBottom: 16 }}>Profile</h1>
      <div className="workspace-asset-card">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div className="input-label">Name</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{session.user.name}</div>
          </div>
          <div>
            <div className="input-label">Email</div>
            <div style={{ fontSize: 15 }}>{session.user.email}</div>
          </div>
          <div>
            <div className="input-label">Company</div>
            <div style={{ fontSize: 15 }}>{session.user.company || "—"}</div>
          </div>
          <div>
            <div className="input-label">Role</div>
            <div style={{ fontSize: 15 }}>{session.user.role}</div>
          </div>
          <div>
            <label className="input-label" htmlFor="profile-whatsapp">
              WhatsApp number
            </label>
            <input
              id="profile-whatsapp"
              className="input"
              type="tel"
              inputMode="tel"
              placeholder="082 123 4567"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
            <p className="contact-note" style={{ marginTop: 6 }}>
              Required before you can publish assets. Stored in international format.
            </p>
          </div>
          <button
            className="btn btn-brand"
            style={{ alignSelf: "flex-start" }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save WhatsApp number"}
          </button>
          <button className="btn btn-danger-outline" style={{ alignSelf: "flex-start", marginTop: 8 }} onClick={signOut}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + emit**

```bash
cd apps/web && npx tsc -p tsconfig.json
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/ProfilePage.tsx apps/web/src/pages/ProfilePage.js
git commit -m "feat(web): let owners save their WhatsApp number on the profile page"
```

---

## Task 5: API — booking-details endpoint (private WhatsApp access)

**Files:**
- Modify: `apps/api/src/store.ts`
- Modify: `apps/api/src/server.ts`
- Modify: `apps/web/src/api.ts`

- [ ] **Step 1: Add `getAssetBookingDetails` to the store**

In `apps/api/src/store.ts`, add (in the Helpers section):

```ts
export async function getAssetBookingDetails(assetId: string) {
  const { data: asset, error: assetError } = await supabaseAdmin
    .from("assets")
    .select("id, title, owner_id, status")
    .eq("id", assetId)
    .single();

  if (assetError || !asset) throw new Error("Asset not found.");
  if (asset.status !== "published") throw new Error("Asset is not available for booking.");

  const { data: owner } = await supabaseAdmin
    .from("profiles")
    .select("name, whatsapp_number")
    .eq("id", asset.owner_id)
    .single();

  return {
    asset: { id: asset.id, title: asset.title },
    owner: {
      name: owner?.name ?? "",
      whatsappNumber: owner?.whatsapp_number ?? null,
    },
  };
}
```

- [ ] **Step 2: Add the authenticated endpoint**

In `apps/api/src/server.ts`, add a route (after the asset write routes, before Bookings). It must require auth so WhatsApp numbers are never returned to anonymous callers:

```ts
app.get("/assets/:id/booking-details", requireAuth, async (request: AuthenticatedRequest, response) => {
  try {
    const details = await store.getAssetBookingDetails(String(request.params.id));
    response.json(details);
  } catch (error) {
    response.status(404).json({ error: (error as Error).message });
  }
});
```

> `requireAuth` is already imported in `server.ts`. Confirm it is in the import from `./middleware/auth.js`; the current import line is `import { attachAuth, requireAuth, requireRole } from "./middleware/auth.js";` — `requireAuth` is present.

- [ ] **Step 3: Add the client method and type import**

In `apps/web/src/api.ts`, add `AssetBookingDetails` to the type import block and add the method (after `getMonthAvailability`):

```ts
import type {
  Asset,
  AssetBookingDetails,
  AssetStatus,
  AvailabilityResponse,
  Booking,
  LoginResponse,
  MonthAvailabilityResponse,
  PublicUser,
  QrCode,
  Session,
  User,
} from "@scanya/shared";
```

```ts
  getAssetBookingDetails(token: string, assetId: string) {
    return request<AssetBookingDetails>(`/assets/${assetId}/booking-details`, {}, token);
  },
```

- [ ] **Step 4: Verify**

```bash
npm run typecheck -w @scanya/api
cd apps/web && npx tsc -p tsconfig.json
```

Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
cd ../..
git add apps/api/src/store.ts apps/api/src/server.ts apps/web/src/api.ts apps/web/src/api.js
git commit -m "feat(api): add authenticated asset booking-details endpoint with owner whatsapp"
```

---

## Task 6: API + client — persist booking `location`

**Files:**
- Modify: `apps/api/src/server.ts`
- Modify: `apps/api/src/store.ts`
- Modify: `apps/web/src/api.ts`

- [ ] **Step 1: Require `location` in the booking schema**

In `apps/api/src/server.ts`, update `bookingSchema`:

```ts
const bookingSchema = z.object({
  assetId: z.string().min(1),
  contactEmail: z.string().email(),
  contactName: z.string().min(2),
  endAt: z.string().datetime(),
  location: z.string().min(2),
  notes: z.string().optional(),
  startAt: z.string().datetime(),
});
```

- [ ] **Step 2: Add `location` to the store input + insert**

In `apps/api/src/store.ts`, extend `CreateBookingInput`:

```ts
export interface CreateBookingInput {
  assetId: string;
  contactName: string;
  contactEmail: string;
  location: string;
  startAt: string;
  endAt: string;
  notes?: string;
}
```

And in `createBooking`, add `location` to the insert object:

```ts
    .insert({
      asset_id: input.assetId,
      requester_id: requesterId,
      contact_name: input.contactName,
      contact_email: input.contactEmail,
      location: input.location,
      start_at: input.startAt,
      end_at: input.endAt,
      status: isAnonymous ? "pending_verification" : "pending",
      verification_token: verificationToken,
      verification_expires_at: verificationExpiresAt,
      notes: input.notes ?? null,
    })
```

- [ ] **Step 3: Add `location` to the client booking inputs**

In `apps/web/src/api.ts`, add `location: string;` to the input object of **both** `createAnonymousBooking` and `createBooking`:

```ts
  createAnonymousBooking: (input: {
    assetId: string;
    contactEmail: string;
    contactName: string;
    endAt: string;
    location: string;
    notes?: string;
    startAt: string;
  }) =>
    request<{ booking: Booking }>("/bookings", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  createBooking(
    token: string,
    input: {
      assetId: string;
      contactEmail: string;
      contactName: string;
      endAt: string;
      location: string;
      notes?: string;
      startAt: string;
    },
  ) {
    return request<{ booking: Booking; notification: string }>(
      "/bookings",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      token,
    );
  },
```

- [ ] **Step 4: Verify**

```bash
npm run typecheck -w @scanya/api
cd apps/web && npx tsc -p tsconfig.json
```

Expected: `@scanya/api` PASS. Web tsc will FAIL in `AppContext.tsx` (`createAnonymousBooking` and `createBooking` callers now miss `location`). That is resolved in Tasks 8–9. If running standalone, temporarily pass `location: ""` at those call sites; otherwise proceed.

- [ ] **Step 5: Commit (stage with Task 9, or alone if web compiles)**

```bash
cd ../..
git add apps/api/src/server.ts apps/api/src/store.ts apps/web/src/api.ts
git commit -m "feat(api): require and persist booking location"
```

---

## Task 7: API + client — publish requires owner WhatsApp

**Files:**
- Modify: `apps/api/src/store.ts`
- Modify: `apps/web/src/state/AppContext.tsx`
- Modify: `apps/web/src/pages/WorkspaceAssetsPage.tsx`

- [ ] **Step 1: Guard publishing in the store**

In `apps/api/src/store.ts`, update `setAssetStatus` so publishing requires the asset owner to have a WhatsApp number (covers owners **and** super admins publishing someone else's asset):

```ts
export async function setAssetStatus(
  assetId: string,
  ownerId: string,
  status: "draft" | "published" | "archived",
  isAdmin = false,
) {
  if (status === "published") {
    const { data: asset, error: assetError } = await supabaseAdmin
      .from("assets")
      .select("owner_id")
      .eq("id", assetId)
      .single();

    if (assetError || !asset) throw new Error("Asset not found or access denied.");
    if (!isAdmin && asset.owner_id !== ownerId) {
      throw new Error("Asset not found or access denied.");
    }

    const { data: ownerProfile } = await supabaseAdmin
      .from("profiles")
      .select("whatsapp_number")
      .eq("id", asset.owner_id)
      .single();

    if (!ownerProfile?.whatsapp_number) {
      throw new Error("Add your WhatsApp number before publishing assets.");
    }
  }

  let query = supabaseAdmin
    .from("assets")
    .update({ status })
    .eq("id", assetId);

  if (!isAdmin) {
    query = query.eq("owner_id", ownerId);
  }

  const { data, error } = await query.select().single();

  if (error) throw new Error("Asset not found or access denied.");
  return data;
}
```

- [ ] **Step 2: Surface the result as an alert + client pre-check**

In `apps/web/src/state/AppContext.tsx`, update `updateAssetStatus` to use alerts and short-circuit publishing your own asset without a WhatsApp number:

```ts
  async function updateAssetStatus(assetId: string, status: AssetStatus) {
    if (!session) return;

    if (
      status === "published" &&
      session.user.role !== "super_admin" &&
      !session.user.whatsappNumber
    ) {
      pushAlert("warning", "Add your WhatsApp number before publishing assets.");
      return;
    }

    try {
      await api.updateAssetStatus(session.token, assetId, status);
      await refreshAssets();
      pushAlert("success", `Asset moved to ${status}.`);
    } catch (error) {
      pushAlert("error", (error as Error).message);
    }
  }
```

> `pushAlert` is in scope within `AppProvider`. Leave the existing `setMessage` calls elsewhere; alerts are additive.

- [ ] **Step 3: (No change needed in WorkspaceAssetsPage markup)**

`WorkspaceAssetsPage` already calls `updateAssetStatus`; the alert now fires automatically. No edit required — included here only to confirm the publish button path is covered. Skip editing this file.

- [ ] **Step 4: Verify**

```bash
npm run typecheck -w @scanya/api
cd apps/web && npx tsc -p tsconfig.json
```

Expected: `@scanya/api` PASS. Web may still FAIL on the Task 6 booking call sites until Tasks 8–9 land — that is expected.

- [ ] **Step 5: Commit (stage with Task 9 if web not yet compiling)**

```bash
cd ../..
git add apps/api/src/store.ts apps/web/src/state/AppContext.tsx apps/web/src/state/AppContext.js
git commit -m "feat: block publishing assets until the owner has a WhatsApp number"
```

---

## Task 8: Auth-gated booking flow (gate, login redirect, restore)

**Files:**
- Modify: `apps/web/src/components/DayTimeline.tsx`
- Modify: `apps/web/src/pages/LoginPage.tsx`
- Modify: `apps/web/src/pages/AssetDetailPage.tsx`

- [ ] **Step 1: Gate "Continue" in DayTimeline**

In `apps/web/src/components/DayTimeline.tsx`, import `useNavigate` and pull `session` from context, then gate the continue handler. Update the imports and the destructure:

```tsx
import { useNavigate } from "react-router-dom";
import { useAppState } from "../state/AppContext";
import type { AvailabilityWindow, Booking } from "@scanya/shared";
```

Add `assetId` is already a prop. Update the component body destructure and handler:

```tsx
export function DayTimeline({ assetId }: Props) {
  const {
    selectedDate,
    availability,
    selectedSlot,
    selectSlot,
    setCalendarView,
    setBookingStep,
    session,
  } = useAppState();
  const navigate = useNavigate();
```

Replace `handleContinue`:

```tsx
  const handleContinue = () => {
    if (!selectedSlot) return;

    if (!session) {
      const redirect = `/assets/${assetId}?booking=1`;
      sessionStorage.setItem("postLoginRedirect", redirect);
      sessionStorage.setItem(
        "pendingBooking",
        JSON.stringify({ assetId, selectedDate, selectedSlot }),
      );
      navigate(`/app/login?redirect=${encodeURIComponent(redirect)}`);
      return;
    }

    setBookingStep("contact");
  };
```

- [ ] **Step 2: Honor `?redirect=` on the login page**

Replace `apps/web/src/pages/LoginPage.tsx` with:

```tsx
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppState } from "../state/AppContext";

export function LoginPage() {
  const { signIn, setLoginForm, loginForm, message } = useAppState();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const success = await signIn(e);
    setSubmitting(false);
    if (success) {
      const redirect =
        searchParams.get("redirect") ??
        sessionStorage.getItem("postLoginRedirect") ??
        "/app";
      navigate(redirect);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h2 className="login-title">Owner Login</h2>
        <p className="login-subtitle">Sign in to manage your assets and bookings</p>
        {message && (
          <p style={{ color: "var(--danger)", fontSize: 13, marginBottom: 16 }}>{message}</p>
        )}
        <form onSubmit={handleSubmit}>
          <div className="contact-field">
            <label className="input-label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              className="input"
              type="email"
              required
              value={loginForm.email}
              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
            />
          </div>
          <div className="contact-field">
            <label className="input-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              className="input"
              type="password"
              required
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
            />
          </div>
          <button className="btn-brand-lg" type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Push a login-success alert**

In `apps/web/src/state/AppContext.tsx`, in `signIn`, after `setSession(...)` add an alert (keep the existing `setMessage`):

```ts
      setSession({ token: data.session.access_token, user });
      setMessage(`Signed in as ${user.name}.`);
      pushAlert("success", `Signed in as ${user.name}.`);
      return true;
```

- [ ] **Step 4: Restore the pending booking after login in AssetDetailPage**

In `apps/web/src/pages/AssetDetailPage.tsx`, add the restore effect. Update imports and add context + searchParams:

```tsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useAppState } from "../state/AppContext";
import { BookingCalendar } from "../components/BookingCalendar";
import { supabase } from "../lib/supabase";
import { mapQrCode } from "../lib/dbMappers";
```

In the component body, extend the destructure and add a restore effect:

```tsx
  const { assetId, token } = useParams();
  const [searchParams] = useSearchParams();
  const {
    assets,
    refreshAssets,
    session,
    selectDate,
    selectSlot,
    loadAvailability,
    setCalendarView,
    setBookingStep,
  } = useAppState();
```

Add this effect after the existing effects:

```tsx
  useEffect(() => {
    if (searchParams.get("booking") !== "1" || !session) return;

    const raw = sessionStorage.getItem("pendingBooking");
    if (!raw) return;

    try {
      const pending = JSON.parse(raw) as {
        assetId: string;
        selectedDate: string;
        selectedSlot: { startAt: string; endAt: string };
      };
      const targetAssetId = assetId ?? resolvedAssetId;
      if (pending.assetId !== targetAssetId) return;

      selectDate(pending.selectedDate);
      void loadAvailability(pending.assetId, pending.selectedDate);
      selectSlot(pending.selectedSlot);
      setCalendarView("day");
      setBookingStep("contact");
    } catch {
      // ignore malformed pending state
    } finally {
      sessionStorage.removeItem("pendingBooking");
      sessionStorage.removeItem("postLoginRedirect");
    }
  }, [
    searchParams,
    session,
    assetId,
    resolvedAssetId,
    selectDate,
    loadAvailability,
    selectSlot,
    setCalendarView,
    setBookingStep,
  ]);
```

> `resolvedAssetId` is declared earlier in the component (`const [resolvedAssetId, setResolvedAssetId] = useState(...)`). Place this effect after that declaration and after the existing token-resolution effect.

- [ ] **Step 5: Typecheck + emit**

```bash
cd apps/web && npx tsc -p tsconfig.json
```

Expected: still FAILS only on the ContactForm `createAnonymousBooking` call missing `location` (resolved in Task 9). All Task 8 files compile.

- [ ] **Step 6: Commit (stage with Task 9)**

Hold this commit and land it together with Task 9 so the web tree compiles cleanly. Proceed to Task 9.

---

## Task 9: Authenticated ContactForm + WhatsApp redirect

**Files:**
- Modify: `apps/web/src/state/AppContext.tsx`
- Modify: `apps/web/src/components/ContactForm.tsx`

- [ ] **Step 1: Add `location` to the booking form state**

In `apps/web/src/state/AppContext.tsx`, add `location` to `BookingFormState`:

```ts
type BookingFormState = {
  contactEmail: string;
  contactName: string;
  endAt: string;
  location: string;
  notes: string;
  startAt: string;
};
```

And to `initialBookingForm`:

```ts
const initialBookingForm: BookingFormState = {
  contactEmail: "attendee@scanya.app",
  contactName: "Attendee Demo",
  endAt: `${tomorrow()}T16:00:00.000Z`,
  location: "",
  notes: "",
  startAt: `${tomorrow()}T10:00:00.000Z`,
};
```

- [ ] **Step 2: Add booking-details state + `submitBooking` to AppContext**

Add imports at the top of `AppContext.tsx`:

```ts
import type { Asset, AssetBookingDetails, AssetStatus, AvailabilityResponse, Booking, MonthAvailabilityResponse, PublicUser, User } from "@scanya/shared";
import { buildWhatsappMessage, buildWhatsappUrl } from "../lib/whatsapp";
```

Add to the `AppContextValue` type:

```ts
  bookingDetails: AssetBookingDetails | null;
  loadBookingDetails: (assetId: string) => Promise<void>;
  submitBooking: (assetId: string, input: { contactName: string; contactEmail: string; location: string; notes: string }) => Promise<void>;
```

Add state in `AppProvider` (near `selectedSlot`):

```ts
  const [bookingDetails, setBookingDetails] = useState<AssetBookingDetails | null>(null);
```

Add the two functions (near `createAnonymousBooking`):

```ts
  const loadBookingDetails = useCallback(async (assetId: string) => {
    if (!session) return;
    try {
      const details = await api.getAssetBookingDetails(session.token, assetId);
      setBookingDetails(details);
      if (!details.owner.whatsappNumber) {
        pushAlert("warning", "This asset owner has not added a WhatsApp number yet.");
      }
    } catch (error) {
      setBookingDetails(null);
      pushAlert("error", (error as Error).message);
    }
  }, [session, pushAlert]);

  const submitBooking = useCallback(async (
    assetId: string,
    input: { contactName: string; contactEmail: string; location: string; notes: string },
  ) => {
    if (!session) {
      pushAlert("error", "Sign in before creating a booking.");
      return;
    }
    if (!selectedSlot) {
      pushAlert("error", "Select a time slot first.");
      return;
    }
    if (!bookingDetails?.owner.whatsappNumber) {
      pushAlert("warning", "This asset owner has not added a WhatsApp number yet.");
      return;
    }

    try {
      const { booking } = await api.createBooking(session.token, {
        assetId,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        location: input.location,
        startAt: selectedSlot.startAt,
        endAt: selectedSlot.endAt,
        notes: input.notes || undefined,
      });

      setLastBookingRef(booking.id);
      setBookingStep("success");

      const message = buildWhatsappMessage({
        assetTitle: bookingDetails.asset.title,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        location: input.location,
        startAt: selectedSlot.startAt,
        endAt: selectedSlot.endAt,
        bookingId: booking.id,
        notes: input.notes,
      });

      pushAlert("info", "Opening WhatsApp to send your request…");
      window.location.href = buildWhatsappUrl(bookingDetails.owner.whatsappNumber, message);
    } catch (error) {
      pushAlert("error", (error as Error).message);
    }
  }, [session, selectedSlot, bookingDetails, pushAlert]);
```

> `api.createBooking` returns `{ booking, notification }`. `booking.id` is the persisted booking reference. The booking is created **before** the redirect so the record survives a failed handoff (per spec).

Expose them in the `value` `useMemo` object and dependency array:

```ts
      bookingDetails,
      loadBookingDetails,
      submitBooking,
```

Add `bookingDetails`, `loadBookingDetails`, `submitBooking` to the `useMemo` deps.

- [ ] **Step 3: Rebuild ContactForm for authenticated WhatsApp booking**

Replace `apps/web/src/components/ContactForm.tsx` with:

```tsx
import { useEffect, useState } from "react";
import { useAppState } from "../state/AppContext";

type Props = {
  assetId: string;
  assetTitle: string;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

export function ContactForm({ assetId, assetTitle }: Props) {
  const {
    selectedSlot,
    selectedDate,
    setBookingStep,
    session,
    bookingDetails,
    loadBookingDetails,
    submitBooking,
  } = useAppState();

  const [name, setName] = useState(session?.user.name ?? "");
  const [email, setEmail] = useState(session?.user.email ?? "");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void loadBookingDetails(assetId);
  }, [assetId, loadBookingDetails]);

  if (!selectedSlot) return null;

  const dateObj = new Date(selectedDate + "T00:00:00Z");
  const dayLabel = dateObj.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

  const ownerHasWhatsapp = Boolean(bookingDetails?.owner.whatsappNumber);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await submitBooking(assetId, {
      contactName: name,
      contactEmail: email,
      location,
      notes,
    });
    setSubmitting(false);
  };

  return (
    <div className="contact-form">
      <div className="contact-slot-summary">
        <div>
          <div className="contact-slot-label">Your booking</div>
          <div className="contact-slot-value">
            {dayLabel}, {formatTime(selectedSlot.startAt)} &ndash;{" "}
            {formatTime(selectedSlot.endAt)}
          </div>
        </div>
        <button
          className="contact-change-link"
          onClick={() => setBookingStep("calendar")}
        >
          Change
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="contact-field">
          <label className="input-label" htmlFor="booking-name">Your name</label>
          <input
            id="booking-name"
            className="input"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
          />
        </div>

        <div className="contact-field">
          <label className="input-label" htmlFor="booking-email">Your email</label>
          <input
            id="booking-email"
            className="input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div className="contact-field">
          <label className="input-label" htmlFor="booking-location">Where do you need it?</label>
          <input
            id="booking-location"
            className="input"
            type="text"
            required
            minLength={2}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Address or area"
          />
        </div>

        <div className="contact-field">
          <label className="input-label" htmlFor="booking-notes">Notes (optional)</label>
          <textarea
            id="booking-notes"
            className="input"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Tell the owner about your event or needs"
          />
        </div>

        <button
          className="btn-brand-lg"
          type="submit"
          disabled={submitting || !ownerHasWhatsapp}
        >
          {submitting ? "Sending..." : "Send via WhatsApp →"}
        </button>
      </form>

      {!ownerHasWhatsapp && (
        <p className="contact-note">
          This asset owner has not added a WhatsApp number yet, so booking is unavailable.
        </p>
      )}
      <p className="contact-note">
        We’ll save your request for <strong>{assetTitle}</strong>, then open WhatsApp to message the owner.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck + emit (web tree should now be fully green)**

```bash
cd apps/web && npx tsc -p tsconfig.json
npm run test -w @scanya/web
```

Expected: tsc PASS (no errors), vitest PASS.

- [ ] **Step 5: Commit Tasks 6–9 web changes together**

```bash
cd ../..
git add apps/web/src/components/DayTimeline.tsx apps/web/src/components/DayTimeline.js \
  apps/web/src/pages/LoginPage.tsx apps/web/src/pages/LoginPage.js \
  apps/web/src/pages/AssetDetailPage.tsx apps/web/src/pages/AssetDetailPage.js \
  apps/web/src/components/ContactForm.tsx apps/web/src/components/ContactForm.js \
  apps/web/src/state/AppContext.tsx apps/web/src/state/AppContext.js \
  apps/web/src/api.ts apps/web/src/api.js
git commit -m "feat(web): authenticated WhatsApp booking flow with login gate and redirect"
```

---

## Task 10: Full integration verification

**Files:** none (verification only)

- [ ] **Step 1: Typecheck the whole workspace + run unit tests**

```bash
npm run typecheck
npm run test -w @scanya/web
```

Expected: all workspaces typecheck clean; vitest green.

- [ ] **Step 2: Build the web app end-to-end**

```bash
npm run build -w @scanya/web
```

Expected: `tsc` + `vite build` succeed.

- [ ] **Step 3: Manual browser walkthrough**

Start API and web (`npm run dev:api`, `npm run dev:web`) and verify each acceptance criterion:

1. Visit `/assets` logged out → only `published` assets show.
2. Open an asset → details render without login.
3. Pick a date + slot → click **Continue** while logged out → redirected to `/app/login?redirect=...`.
4. Sign in → returned to `/assets/:id?booking=1`, slot restored, on the contact step. Login-success alert appears top-right and auto-dismisses after 5s.
5. Contact form prefilled with your name/email; enter a location; submit → a `pending` booking row is created, then WhatsApp opens with who/where/when/title/reference.
6. As an owner with **no** WhatsApp number, try to publish an asset → blocked with a warning alert. Add a number on `/app/profile`, save (success alert), then publish → succeeds.
7. With the owner missing a WhatsApp number, the booking contact form shows the "not added a WhatsApp number yet" note and the submit button is disabled.
8. Confirm via the Supabase dashboard that an anon `select whatsapp_number from profiles` returns nothing (privacy hardening holds).

- [ ] **Step 4: Final commit (if any `.js` drifted)**

```bash
cd apps/web && npx tsc -p tsconfig.json && cd ../..
git add -A
git commit -m "chore(web): sync compiled output after whatsapp booking feature" || echo "nothing to commit"
```

---

## Self-Review Notes

- **Spec coverage:** system alerts (Task 3), public browsing (already in `refreshAssets`; verified Task 10), auth-gated start (Task 8), booking form + `location` (Tasks 6, 9), booking persistence before WhatsApp (Task 9), WhatsApp redirect (Tasks 0 helpers + 9), owner WhatsApp management (Task 4), publish rule (Task 7), booking-details endpoint (Task 5), RLS tightening + privacy (Task 1). All twelve acceptance criteria map to a task.
- **Deviations from the doc (intentional):**
  - Profile WhatsApp save uses the web Supabase client (RLS "Users update own profile") instead of `PATCH /me` — the repo has no `/me` route and already does owner-self writes directly. `api.updateMe`'s type can optionally gain `whatsappNumber` later; not required for this flow.
  - Privacy is enforced harder than the doc: the permissive public `profiles` read policy is dropped so the anon client cannot read `whatsapp_number` at all (your chosen "fully hide" option), with the authed booking-details endpoint as the only exposure path for published assets.
  - `AssetBookingDetails.asset` is `{ id, title }` (the only fields the flow needs) rather than the full `Asset`.
  - The pre-existing anonymous (email-verification) booking path is left intact server-side but is no longer the primary flow; the UI now gates on auth.
- **Optional / out of scope:** per-asset `assets.whatsapp_number` override (YAGNI), a `public_profiles` view if public owner names are ever needed in anon contexts.
