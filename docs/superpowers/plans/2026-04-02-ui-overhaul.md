# scanYa UI Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the scanYa frontend with a warm, mobile-first design and frictionless booking flow (no account required), plus a professional owner workspace with sidebar navigation.

**Architecture:** Two-track layout — public pages (minimal header, single-column, mobile-first) and workspace (dark sidebar on desktop, bottom tabs on mobile). Calendar component toggles between month view and day hourly view. API modified to accept anonymous bookings and serve monthly availability summaries.

**Tech Stack:** React 19, React Router v7, TypeScript, Vite, plain CSS with design tokens, Express API with Zod validation.

---

## File Structure

### New Files
- `apps/web/src/styles/tokens.css` — Design token variables (extracted from monolithic styles.css)
- `apps/web/src/styles/global.css` — Reset, typography, utility classes
- `apps/web/src/styles/public.css` — Public track component styles
- `apps/web/src/styles/workspace.css` — Workspace track component styles
- `apps/web/src/styles/calendar.css` — Calendar component styles
- `apps/web/src/components/MonthCalendar.tsx` — Month grid calendar view
- `apps/web/src/components/DayTimeline.tsx` — Hourly slot timeline for a selected day
- `apps/web/src/components/BookingCalendar.tsx` — Parent component toggling month/day views
- `apps/web/src/components/ContactForm.tsx` — Name, email, notes form for anonymous booking
- `apps/web/src/components/BookingCard.tsx` — Reusable booking request card (workspace)
- `apps/web/src/components/StatCard.tsx` — Dashboard stat card component
- `apps/web/src/components/StatusPill.tsx` — Colored status badge
- `apps/web/src/pages/LoginPage.tsx` — Owner login page

### Modified Files
- `packages/shared/src/index.ts` — Add `MonthAvailability` type, make `requesterId` nullable
- `apps/api/src/store.ts` — Add `getMonthAvailability()` method, update `createBooking()` for nullable requesterId
- `apps/api/src/server.ts` — Add monthly availability endpoint, allow anonymous bookings
- `apps/web/src/api.ts` — Add `getMonthAvailability()`, update `createBooking()` to work without auth
- `apps/web/src/state/AppContext.tsx` — Add month availability state, calendar view state, anonymous booking flow
- `apps/web/src/App.tsx` — Update routes (add login page, remove events routes)
- `apps/web/src/layouts/PublicLayout.tsx` — Redesign with minimal warm header
- `apps/web/src/layouts/WorkspaceLayout.tsx` — Redesign with dark sidebar + mobile bottom tabs
- `apps/web/src/pages/HomePage.tsx` — Replace with marketplace (redirect to /assets)
- `apps/web/src/pages/AssetsPage.tsx` — Redesign with warm card grid
- `apps/web/src/pages/AssetDetailPage.tsx` — Redesign with new calendar and anonymous booking
- `apps/web/src/pages/WorkspaceDashboardPage.tsx` — Redesign with stat cards + pending requests
- `apps/web/src/pages/WorkspaceAssetsPage.tsx` — Redesign with new card layout
- `apps/web/src/pages/WorkspaceBookingsPage.tsx` — Redesign with filter tabs + booking cards
- `apps/web/src/pages/WorkspaceQrPage.tsx` — Restyle to match new design
- `apps/web/src/pages/ProfilePage.tsx` — Restyle to match new design

### Deleted Files
- `apps/web/src/styles.css` — Replaced by split CSS files
- `apps/web/src/components/AuthPanel.tsx` — Replaced by LoginPage + anonymous booking
- `apps/web/src/pages/EventsPage.tsx` — Out of scope (Phase 2)
- `apps/web/src/pages/EventDetailPage.tsx` — Out of scope (Phase 2)

---

## Task 1: Design Tokens and Base Styles

**Files:**
- Create: `apps/web/src/styles/tokens.css`
- Create: `apps/web/src/styles/global.css`
- Modify: `apps/web/src/main.tsx`
- Delete: `apps/web/src/styles.css`

- [ ] **Step 1: Create design tokens file**

Create `apps/web/src/styles/tokens.css`:

```css
:root {
  /* Backgrounds */
  --bg-primary: #FFF9F5;
  --bg-workspace: #FDFBF9;
  --sidebar-bg: #2D2A26;

  /* Text */
  --text-primary: #2D2A26;
  --text-secondary: #6B6560;
  --text-muted: #8C8279;
  --text-dimmed: #A89E95;
  --text-white: #FFFFFF;

  /* Brand */
  --brand: #E8734A;
  --brand-light: #FFF0E8;
  --brand-border: #F5D0BB;
  --brand-dark: #C4603D;

  /* Success */
  --success: #2D7A4F;
  --success-light: #E8F5EE;
  --success-border: #B8E0CA;
  --success-text: #6B9E7E;

  /* Danger */
  --danger: #C44A3F;
  --danger-light: #FDF0EF;
  --danger-border: #E8C0BC;

  /* Surfaces */
  --surface: #FFFFFF;
  --border: #E8E0D8;
  --border-light: #F0E6DD;
  --neutral-bg: #F5F0EB;

  /* Radius */
  --radius-xs: 8px;
  --radius-sm: 10px;
  --radius-md: 12px;
  --radius-lg: 14px;

  /* Shadows */
  --shadow-brand: 0 2px 8px rgba(232, 115, 74, 0.3);
  --shadow-elevated: 0 2px 12px rgba(232, 115, 74, 0.15);
}
```

- [ ] **Step 2: Create global styles file**

Create `apps/web/src/styles/global.css`:

```css
@import "./tokens.css";

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 16px;
  color: var(--text-primary);
  background: var(--bg-primary);
  -webkit-font-smoothing: antialiased;
}

body {
  min-height: 100dvh;
}

a {
  color: inherit;
  text-decoration: none;
}

button {
  font: inherit;
  cursor: pointer;
  border: none;
  background: none;
}

input, textarea, select {
  font: inherit;
  color: inherit;
}

h1, h2, h3, h4, h5, h6 {
  font-weight: 700;
  line-height: 1.2;
}

/* Utility classes */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  border-radius: var(--radius-xs);
  transition: opacity 0.15s;
  min-height: 44px;
}

.btn:active {
  opacity: 0.85;
}

.btn-brand {
  background: var(--brand);
  color: var(--text-white);
}

.btn-brand-lg {
  background: var(--brand);
  color: var(--text-white);
  width: 100%;
  padding: 14px;
  font-size: 16px;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-brand);
}

.btn-success {
  background: var(--success);
  color: var(--text-white);
}

.btn-danger-outline {
  background: transparent;
  color: var(--danger);
  border: 1px solid var(--danger-border);
}

.btn-ghost {
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border);
}

/* Form inputs */
.input {
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  min-height: 44px;
}

.input:focus {
  outline: 2px solid var(--brand);
  outline-offset: -1px;
  border-color: var(--brand);
}

.input-label {
  display: block;
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 6px;
}

/* Category pill */
.category-pill {
  display: inline-block;
  background: var(--brand-light);
  color: var(--brand);
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 20px;
}
```

- [ ] **Step 3: Update main.tsx to import new styles**

Replace the import in `apps/web/src/main.tsx`. Change:
```typescript
import "./styles.css";
```
to:
```typescript
import "./styles/global.css";
import "./styles/public.css";
import "./styles/workspace.css";
import "./styles/calendar.css";
```

Note: `main.tsx` does not import styles directly — the import is in `App.tsx` at line 15. Update `apps/web/src/App.tsx` line 15 instead:

Change line 15 of `apps/web/src/App.tsx`:
```typescript
import "./styles.css";
```
to:
```typescript
import "./styles/global.css";
import "./styles/public.css";
import "./styles/workspace.css";
import "./styles/calendar.css";
```

- [ ] **Step 4: Create empty CSS files for later tasks**

Create `apps/web/src/styles/public.css`:
```css
/* Public track styles — populated in Task 5 */
```

Create `apps/web/src/styles/workspace.css`:
```css
/* Workspace track styles — populated in Task 8 */
```

Create `apps/web/src/styles/calendar.css`:
```css
/* Calendar component styles — populated in Task 6 */
```

- [ ] **Step 5: Delete old styles file**

Delete `apps/web/src/styles.css`.

- [ ] **Step 6: Verify the app compiles**

Run: `cd /Users/thabomollomponya/Dev/scanYa && npm run typecheck`
Expected: No TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/styles/ apps/web/src/App.tsx
git rm apps/web/src/styles.css
git commit -m "feat: replace monolithic CSS with split design tokens and global styles"
```

---

## Task 2: Shared Types and API — Anonymous Booking + Monthly Availability

**Files:**
- Modify: `packages/shared/src/index.ts`
- Modify: `apps/api/src/store.ts`
- Modify: `apps/api/src/server.ts`
- Modify: `apps/web/src/api.ts`

- [ ] **Step 1: Add MonthAvailability type and update Booking type**

In `packages/shared/src/index.ts`, add after the `AvailabilityResponse` type (after line 88):

```typescript
export type DayAvailabilitySummary = {
  date: string;
  hasOpenSlots: boolean;
  slotCount: number;
};

export type MonthAvailabilityResponse = {
  assetId: string;
  month: string;
  days: DayAvailabilitySummary[];
};
```

Also update the `Booking` type — change `requesterId: string;` to:
```typescript
  requesterId: string | null;
```

- [ ] **Step 2: Add getMonthAvailability to store**

In `apps/api/src/store.ts`, add this method after the `getAvailability` method (after line 254):

```typescript
  getMonthAvailability(assetId: string, month: string) {
    const asset = this.assets.find((entry) => entry.id === assetId && entry.status === "published");
    if (!asset) {
      throw new Error("Asset not found.");
    }

    const [year, monthNum] = month.split("-").map(Number);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const days: { date: string; hasOpenSlots: boolean; slotCount: number }[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const target = new Date(date);
      const dayOfWeek = target.getUTCDay();

      const rules = this.availabilityRules.filter(
        (rule) => rule.assetId === assetId && rule.dayOfWeek === dayOfWeek,
      );

      const dayBookings = this.bookings.filter(
        (booking) =>
          booking.assetId === assetId &&
          ["pending", "confirmed"].includes(booking.status) &&
          booking.startAt.slice(0, 10) === date,
      );

      // A slot is "open" if the rule's time window isn't fully covered by bookings
      let openSlots = 0;
      for (const rule of rules) {
        const ruleStart = new Date(`${date}T${String(rule.startHour).padStart(2, "0")}:00:00.000Z`);
        const ruleEnd = new Date(`${date}T${String(rule.endHour).padStart(2, "0")}:00:00.000Z`);

        const isFullyCovered = dayBookings.some(
          (booking) =>
            new Date(booking.startAt) <= ruleStart && new Date(booking.endAt) >= ruleEnd,
        );

        if (!isFullyCovered) {
          openSlots++;
        }
      }

      days.push({
        date,
        hasOpenSlots: openSlots > 0,
        slotCount: rules.length,
      });
    }

    return { assetId, month, days };
  }
```

- [ ] **Step 3: Update createBooking to accept null requesterId**

In `apps/api/src/store.ts`, change the `createBooking` method signature at line 256 from:
```typescript
  createBooking(requesterId: string, input: CreateBookingInput) {
```
to:
```typescript
  createBooking(requesterId: string | null, input: CreateBookingInput) {
```

- [ ] **Step 4: Add monthly availability endpoint to server**

In `apps/api/src/server.ts`, add after the existing availability endpoint (after line 179):

```typescript
app.get("/assets/:id/availability/month", (req, res) => {
  const month = req.query.month as string;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ error: "month query parameter required (YYYY-MM)" });
    return;
  }
  try {
    const result = store.getMonthAvailability(req.params.id, month);
    res.json(result);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});
```

- [ ] **Step 5: Allow anonymous bookings in server**

In `apps/api/src/server.ts`, the `POST /bookings` route (around line 181) currently uses `requireAuth` middleware. Replace the route to allow optional auth:

Find the existing booking route which looks like:
```typescript
app.post("/bookings", requireAuth, async (req: AuthenticatedRequest, res) => {
```

Replace with:
```typescript
app.post("/bookings", async (req: AuthenticatedRequest, res) => {
```

Then update the body of the route handler. Find the line that creates the booking (calls `store.createBooking`) and change the first argument from `req.user!.id` to `req.user?.id ?? null`.

- [ ] **Step 6: Update API client for anonymous booking and monthly availability**

In `apps/web/src/api.ts`, add these methods to the `api` object:

```typescript
  getMonthAvailability: (assetId: string, month: string) =>
    request<MonthAvailabilityResponse>(`/assets/${assetId}/availability/month?month=${month}`),

  createAnonymousBooking: (input: {
    assetId: string;
    contactEmail: string;
    contactName: string;
    endAt: string;
    notes?: string;
    startAt: string;
  }) =>
    request<{ booking: Booking }>("/bookings", {
      method: "POST",
      body: JSON.stringify(input),
    }),
```

Also add `MonthAvailabilityResponse` to the import from `@scanya/shared` at the top of the file.

- [ ] **Step 7: Verify compilation**

Run: `cd /Users/thabomollomponya/Dev/scanYa && npm run typecheck`
Expected: No TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add packages/shared/src/index.ts apps/api/src/store.ts apps/api/src/server.ts apps/web/src/api.ts
git commit -m "feat: add monthly availability endpoint and anonymous booking support"
```

---

## Task 3: State Management Updates

**Files:**
- Modify: `apps/web/src/state/AppContext.tsx`

- [ ] **Step 1: Add new state types and fields**

In `apps/web/src/state/AppContext.tsx`, add to the `AppContextValue` type:

```typescript
  // Calendar state
  calendarView: "month" | "day";
  selectedMonth: string; // "YYYY-MM"
  monthAvailability: MonthAvailabilityResponse | null;
  selectedSlot: { startAt: string; endAt: string } | null;
  bookingStep: "calendar" | "contact" | "success";
  lastBookingRef: string | null;

  // Calendar actions
  setCalendarView: (view: "month" | "day") => void;
  setSelectedMonth: (month: string) => void;
  loadMonthAvailability: (assetId: string, month: string) => Promise<void>;
  selectSlot: (slot: { startAt: string; endAt: string } | null) => void;
  setBookingStep: (step: "calendar" | "contact" | "success") => void;
  createAnonymousBooking: (assetId: string, input: { contactName: string; contactEmail: string; notes: string }) => Promise<void>;
```

Add the corresponding `MonthAvailabilityResponse` import from `@scanya/shared`.

- [ ] **Step 2: Initialize new state**

In the `AppProvider` component, add state:

```typescript
const [calendarView, setCalendarView] = useState<"month" | "day">("month");
const [selectedMonth, setSelectedMonth] = useState(() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
});
const [monthAvailability, setMonthAvailability] = useState<MonthAvailabilityResponse | null>(null);
const [selectedSlot, selectSlot] = useState<{ startAt: string; endAt: string } | null>(null);
const [bookingStep, setBookingStep] = useState<"calendar" | "contact" | "success">("calendar");
const [lastBookingRef, setLastBookingRef] = useState<string | null>(null);
```

- [ ] **Step 3: Add loadMonthAvailability method**

```typescript
const loadMonthAvailability = useCallback(async (assetId: string, month: string) => {
  try {
    const data = await api.getMonthAvailability(assetId, month);
    setMonthAvailability(data);
  } catch (error) {
    setMessage((error as Error).message);
  }
}, []);
```

- [ ] **Step 4: Add createAnonymousBooking method**

```typescript
const createAnonymousBooking = useCallback(async (
  assetId: string,
  input: { contactName: string; contactEmail: string; notes: string },
) => {
  if (!selectedSlot) return;
  try {
    const { booking } = await api.createAnonymousBooking({
      assetId,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      startAt: selectedSlot.startAt,
      endAt: selectedSlot.endAt,
      notes: input.notes || undefined,
    });
    setLastBookingRef(booking.id);
    setBookingStep("success");
    setMessage("Booking request sent!");
  } catch (error) {
    setMessage((error as Error).message);
  }
}, [selectedSlot]);
```

- [ ] **Step 5: Add all new values to the context provider value object**

Add `calendarView`, `setCalendarView`, `selectedMonth`, `setSelectedMonth`, `monthAvailability`, `loadMonthAvailability`, `selectedSlot`, `selectSlot`, `bookingStep`, `setBookingStep`, `createAnonymousBooking`, `lastBookingRef` to the value object passed to `<AppContext.Provider value={...}>`.

- [ ] **Step 6: Verify compilation**

Run: `cd /Users/thabomollomponya/Dev/scanYa && npm run typecheck`
Expected: No TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/state/AppContext.tsx
git commit -m "feat: add calendar view state and anonymous booking flow to context"
```

---

## Task 4: Calendar Components

**Files:**
- Create: `apps/web/src/components/MonthCalendar.tsx`
- Create: `apps/web/src/components/DayTimeline.tsx`
- Create: `apps/web/src/components/BookingCalendar.tsx`
- Modify: `apps/web/src/styles/calendar.css`

- [ ] **Step 1: Create MonthCalendar component**

Create `apps/web/src/components/MonthCalendar.tsx`:

```tsx
import { useAppState } from "../state/AppContext";

type Props = {
  assetId: string;
};

const DAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function getDaysGrid(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1);
  // Monday = 0, Sunday = 6
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const daysInMonth = new Date(year, month, 0).getDate();
  const daysInPrevMonth = new Date(year, month - 1, 0).getDate();

  const cells: { day: number; currentMonth: boolean; date: string }[] = [];

  // Previous month spillover
  for (let i = startDow - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevMonth = month - 1 < 1 ? 12 : month - 1;
    const prevYear = month - 1 < 1 ? year - 1 : year;
    cells.push({
      day: d,
      currentMonth: false,
      date: `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      currentMonth: true,
      date: `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    });
  }

  // Next month fill to complete grid
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = month + 1 > 12 ? 1 : month + 1;
      const nextYear = month + 1 > 12 ? year + 1 : year;
      cells.push({
        day: d,
        currentMonth: false,
        date: `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      });
    }
  }

  return cells;
}

export function MonthCalendar({ assetId }: Props) {
  const {
    selectedMonth,
    setSelectedMonth,
    monthAvailability,
    loadMonthAvailability,
    selectDate,
    setCalendarView,
    loadAvailability,
  } = useAppState();

  const [year, month] = selectedMonth.split("-").map(Number);
  const monthLabel = new Date(year, month - 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const cells = getDaysGrid(year, month);
  const today = new Date().toISOString().slice(0, 10);

  const goToPrevMonth = () => {
    const prev = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
    setSelectedMonth(prev);
    loadMonthAvailability(assetId, prev);
  };

  const goToNextMonth = () => {
    const next = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
    setSelectedMonth(next);
    loadMonthAvailability(assetId, next);
  };

  const handleDayClick = (date: string) => {
    selectDate(date);
    loadAvailability(assetId, date);
    setCalendarView("day");
  };

  const getDayStatus = (date: string, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return "other";
    if (date < today) return "past";
    const dayInfo = monthAvailability?.days.find((d) => d.date === date);
    if (!dayInfo || dayInfo.slotCount === 0) return "unavailable";
    if (dayInfo.hasOpenSlots) return "available";
    return "unavailable";
  };

  return (
    <div className="month-calendar">
      <div className="month-calendar-header">
        <button className="month-nav-btn" onClick={goToPrevMonth} aria-label="Previous month">
          &larr;
        </button>
        <span className="month-label">{monthLabel}</span>
        <button className="month-nav-btn" onClick={goToNextMonth} aria-label="Next month">
          &rarr;
        </button>
      </div>

      <div className="month-day-headers">
        {DAY_LABELS.map((label) => (
          <div key={label} className="month-day-header">
            {label}
          </div>
        ))}
      </div>

      <div className="month-grid">
        {cells.map((cell) => {
          const status = getDayStatus(cell.date, cell.currentMonth);
          const isClickable = status === "available";
          return (
            <button
              key={cell.date}
              className={`month-cell month-cell--${status}`}
              disabled={!isClickable}
              onClick={() => isClickable && handleDayClick(cell.date)}
              aria-label={`${cell.day}, ${status}`}
            >
              {cell.day}
              {status === "available" && <span className="month-cell-dot" />}
            </button>
          );
        })}
      </div>

      <div className="month-legend">
        <div className="month-legend-item">
          <span className="month-legend-swatch month-legend-swatch--available" />
          Has open slots
        </div>
        <div className="month-legend-item">
          <span className="month-legend-swatch month-legend-swatch--unavailable" />
          Unavailable
        </div>
      </div>

      <p className="month-hint">Tap a green date to see available hours</p>
    </div>
  );
}
```

- [ ] **Step 2: Create DayTimeline component**

Create `apps/web/src/components/DayTimeline.tsx`:

```tsx
import { useAppState } from "../state/AppContext";
import type { AvailabilityWindow, Booking } from "@scanya/shared";

type Props = {
  assetId: string;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

function getHours(startAt: string, endAt: string) {
  const ms = new Date(endAt).getTime() - new Date(startAt).getTime();
  return Math.round(ms / 3_600_000);
}

type SlotInfo = {
  startAt: string;
  endAt: string;
  status: "available" | "selected" | "booked";
};

function buildSlots(
  windows: AvailabilityWindow[],
  bookings: Booking[],
  selectedSlot: { startAt: string; endAt: string } | null,
): SlotInfo[] {
  return windows.map((w) => {
    const isBooked = bookings.some(
      (b) =>
        ["pending", "confirmed"].includes(b.status) &&
        new Date(b.startAt) <= new Date(w.startAt) &&
        new Date(b.endAt) >= new Date(w.endAt),
    );

    const isSelected =
      selectedSlot?.startAt === w.startAt && selectedSlot?.endAt === w.endAt;

    return {
      startAt: w.startAt,
      endAt: w.endAt,
      status: isSelected ? "selected" : isBooked ? "booked" : "available",
    };
  });
}

export function DayTimeline({ assetId }: Props) {
  const {
    selectedDate,
    availability,
    selectedSlot,
    selectSlot,
    setCalendarView,
    setBookingStep,
  } = useAppState();

  const dateObj = new Date(selectedDate + "T00:00:00Z");
  const dayLabel = dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

  const slots = availability
    ? buildSlots(availability.windows, availability.bookings, selectedSlot)
    : [];

  const availableCount = slots.filter((s) => s.status !== "booked").length;

  const handleSelect = (slot: SlotInfo) => {
    if (slot.status === "booked") return;
    if (slot.status === "selected") {
      selectSlot(null);
    } else {
      selectSlot({ startAt: slot.startAt, endAt: slot.endAt });
    }
  };

  const handleContinue = () => {
    setBookingStep("contact");
  };

  return (
    <div className="day-timeline">
      <div className="day-timeline-header">
        <button
          className="day-back-btn"
          onClick={() => setCalendarView("month")}
          aria-label="Back to month"
        >
          &larr;
        </button>
        <div>
          <div className="day-timeline-title">{dayLabel}</div>
          <div className="day-timeline-subtitle">
            {slots.length} slots &bull; {availableCount} available
          </div>
        </div>
      </div>

      <div className="day-slots">
        {slots.map((slot) => (
          <div key={slot.startAt} className="day-slot-row">
            <div className="day-slot-times">
              <div className="day-slot-start">{formatTime(slot.startAt)}</div>
              <div className="day-slot-end">{formatTime(slot.endAt)}</div>
            </div>
            <div className={`day-slot-bar day-slot-bar--${slot.status}`} />
            <button
              className={`day-slot-card day-slot-card--${slot.status}`}
              onClick={() => handleSelect(slot)}
              disabled={slot.status === "booked"}
            >
              <div>
                <div className="day-slot-label">
                  {slot.status === "available" && "Available"}
                  {slot.status === "selected" && "Selected \u2713"}
                  {slot.status === "booked" && "Booked"}
                </div>
                <div className="day-slot-duration">
                  {getHours(slot.startAt, slot.endAt)} hours
                </div>
              </div>
              <div className="day-slot-action">
                {slot.status === "available" && "Select"}
                {slot.status === "selected" && "Change"}
                {slot.status === "booked" && "Unavailable"}
              </div>
            </button>
          </div>
        ))}

        {slots.length === 0 && (
          <p className="day-empty">No availability slots for this day.</p>
        )}
      </div>

      {selectedSlot && (
        <div className="day-summary">
          <div>
            <div className="day-summary-label">Your booking</div>
            <div className="day-summary-value">
              {dayLabel}, {formatTime(selectedSlot.startAt)} &ndash;{" "}
              {formatTime(selectedSlot.endAt)}
            </div>
            <div className="day-summary-duration">
              {getHours(selectedSlot.startAt, selectedSlot.endAt)} hours
            </div>
          </div>
          <button className="btn-brand" onClick={handleContinue}>
            Continue &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create BookingCalendar parent component**

Create `apps/web/src/components/BookingCalendar.tsx`:

```tsx
import { useEffect } from "react";
import { useAppState } from "../state/AppContext";
import { MonthCalendar } from "./MonthCalendar";
import { DayTimeline } from "./DayTimeline";
import { ContactForm } from "./ContactForm";

type Props = {
  assetId: string;
  assetTitle: string;
};

export function BookingCalendar({ assetId, assetTitle }: Props) {
  const {
    calendarView,
    bookingStep,
    selectedMonth,
    loadMonthAvailability,
  } = useAppState();

  useEffect(() => {
    loadMonthAvailability(assetId, selectedMonth);
  }, [assetId, selectedMonth, loadMonthAvailability]);

  if (bookingStep === "contact") {
    return <ContactForm assetId={assetId} assetTitle={assetTitle} />;
  }

  if (bookingStep === "success") {
    return <BookingSuccess assetTitle={assetTitle} />;
  }

  return (
    <div className="booking-calendar">
      <h3 className="booking-calendar-title">Book this asset</h3>
      {calendarView === "month" ? (
        <MonthCalendar assetId={assetId} />
      ) : (
        <DayTimeline assetId={assetId} />
      )}
    </div>
  );
}

function BookingSuccess({ assetTitle }: { assetTitle: string }) {
  const { lastBookingRef, bookingForm } = useAppState();

  return (
    <div className="booking-success">
      <div className="booking-success-icon">&#10003;</div>
      <h3 className="booking-success-title">Booking request sent!</h3>
      <p className="booking-success-text">
        The owner of <strong>{assetTitle}</strong> will review your request and
        contact you at <strong>{bookingForm.contactEmail}</strong>.
      </p>
      {lastBookingRef && (
        <p className="booking-success-ref">Reference: #{lastBookingRef}</p>
      )}
      <a href="/assets" className="btn btn-ghost" style={{ marginTop: 16 }}>
        Browse more assets
      </a>
    </div>
  );
}
```

- [ ] **Step 4: Write calendar CSS**

Replace `apps/web/src/styles/calendar.css` content:

```css
/* === Month Calendar === */
.month-calendar {
  padding: 4px 0;
}

.month-calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.month-nav-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-size: 14px;
  cursor: pointer;
}

.month-label {
  font-weight: 700;
  font-size: 16px;
  color: var(--text-primary);
}

.month-day-headers {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  text-align: center;
  margin-bottom: 8px;
}

.month-day-header {
  font-size: 12px;
  color: var(--text-dimmed);
  font-weight: 600;
}

.month-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  text-align: center;
}

.month-cell {
  position: relative;
  padding: 12px 0;
  font-size: 14px;
  border-radius: var(--radius-sm);
  border: none;
  background: none;
  cursor: default;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.month-cell--available {
  background: var(--success-light);
  color: var(--success);
  font-weight: 600;
  cursor: pointer;
}

.month-cell--available:active {
  background: var(--brand);
  color: var(--text-white);
}

.month-cell--unavailable {
  background: var(--neutral-bg);
  color: var(--text-dimmed);
}

.month-cell--past {
  color: var(--text-dimmed);
}

.month-cell--other {
  color: var(--border);
}

.month-cell-dot {
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 5px;
  height: 5px;
  background: var(--success);
  border-radius: 50%;
}

.month-legend {
  display: flex;
  gap: 20px;
  margin-top: 16px;
  font-size: 12px;
  color: var(--text-muted);
  justify-content: center;
}

.month-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.month-legend-swatch {
  width: 12px;
  height: 12px;
  border-radius: 4px;
}

.month-legend-swatch--available {
  background: var(--success-light);
  border: 1px solid var(--success-border);
}

.month-legend-swatch--unavailable {
  background: var(--neutral-bg);
  border: 1px solid var(--border);
}

.month-hint {
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 12px;
}

/* === Day Timeline === */
.day-timeline {
  padding: 4px 0;
}

.day-timeline-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.day-back-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-size: 14px;
  cursor: pointer;
}

.day-timeline-title {
  font-weight: 700;
  font-size: 18px;
  color: var(--text-primary);
}

.day-timeline-subtitle {
  font-size: 13px;
  color: var(--text-muted);
}

.day-slots {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.day-slot-row {
  display: flex;
  align-items: stretch;
  gap: 12px;
}

.day-slot-times {
  width: 56px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  padding-right: 4px;
}

.day-slot-start {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.day-slot-end {
  font-size: 11px;
  color: var(--text-dimmed);
}

.day-slot-bar {
  width: 3px;
  border-radius: 3px;
}

.day-slot-bar--available {
  background: var(--success-border);
}

.day-slot-bar--selected {
  background: var(--brand);
}

.day-slot-bar--booked {
  background: var(--border);
}

.day-slot-card {
  flex: 1;
  border-radius: var(--radius-lg);
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-align: left;
  cursor: pointer;
  border: 1px solid transparent;
  min-height: 44px;
}

.day-slot-card--available {
  background: var(--success-light);
  border-color: var(--success-border);
}

.day-slot-card--selected {
  background: var(--brand-light);
  border: 2px solid var(--brand);
  box-shadow: var(--shadow-elevated);
}

.day-slot-card--booked {
  background: var(--neutral-bg);
  border-color: var(--border);
  opacity: 0.5;
  cursor: default;
}

.day-slot-label {
  font-size: 15px;
  font-weight: 600;
}

.day-slot-card--available .day-slot-label {
  color: var(--success);
}

.day-slot-card--selected .day-slot-label {
  color: var(--brand);
  font-weight: 700;
}

.day-slot-card--booked .day-slot-label {
  color: var(--text-muted);
}

.day-slot-duration {
  font-size: 13px;
  margin-top: 2px;
}

.day-slot-card--available .day-slot-duration {
  color: var(--success-text);
}

.day-slot-card--selected .day-slot-duration {
  color: var(--brand-dark);
}

.day-slot-card--booked .day-slot-duration {
  color: var(--text-dimmed);
}

.day-slot-action {
  font-size: 12px;
  font-weight: 600;
}

.day-slot-card--available .day-slot-action {
  background: var(--success);
  color: var(--text-white);
  padding: 6px 16px;
  border-radius: var(--radius-xs);
}

.day-slot-card--selected .day-slot-action {
  color: var(--brand);
  border: 1px solid var(--brand);
  padding: 6px 16px;
  border-radius: var(--radius-xs);
}

.day-slot-card--booked .day-slot-action {
  color: var(--text-dimmed);
}

.day-empty {
  text-align: center;
  color: var(--text-muted);
  padding: 32px 0;
}

.day-summary {
  margin-top: 24px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.day-summary-label {
  font-size: 12px;
  color: var(--text-muted);
}

.day-summary-value {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.day-summary-duration {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

/* === Booking Calendar Container === */
.booking-calendar {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 24px;
}

.booking-calendar-title {
  font-size: 18px;
  color: var(--text-primary);
  margin-bottom: 16px;
}

/* === Booking Success === */
.booking-success {
  text-align: center;
  padding: 32px 16px;
}

.booking-success-icon {
  width: 48px;
  height: 48px;
  background: var(--success-light);
  color: var(--success);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin: 0 auto 16px;
}

.booking-success-title {
  font-size: 20px;
  margin-bottom: 12px;
}

.booking-success-text {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  max-width: 400px;
  margin: 0 auto;
}

.booking-success-ref {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 12px;
}
```

- [ ] **Step 5: Verify compilation**

Run: `cd /Users/thabomollomponya/Dev/scanYa && npm run typecheck`
Expected: No TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/MonthCalendar.tsx apps/web/src/components/DayTimeline.tsx apps/web/src/components/BookingCalendar.tsx apps/web/src/styles/calendar.css
git commit -m "feat: add calendar components with month/day toggle view"
```

---

## Task 5: Contact Form Component + Public Styles

**Files:**
- Create: `apps/web/src/components/ContactForm.tsx`
- Modify: `apps/web/src/styles/public.css`

- [ ] **Step 1: Create ContactForm component**

Create `apps/web/src/components/ContactForm.tsx`:

```tsx
import { useState } from "react";
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
  const { selectedSlot, selectedDate, setBookingStep, createAnonymousBooking } =
    useAppState();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!selectedSlot) return null;

  const dateObj = new Date(selectedDate + "T00:00:00Z");
  const dayLabel = dateObj.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await createAnonymousBooking(assetId, {
      contactName: name,
      contactEmail: email,
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
          <label className="input-label" htmlFor="booking-name">
            Your name
          </label>
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
          <label className="input-label" htmlFor="booking-email">
            Your email
          </label>
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
          <label className="input-label" htmlFor="booking-notes">
            Notes (optional)
          </label>
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
          disabled={submitting}
        >
          {submitting ? "Sending..." : "Request Booking \u2192"}
        </button>
      </form>

      <p className="contact-note">
        No account needed. The owner will confirm via your email.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Write public.css styles**

Replace `apps/web/src/styles/public.css`:

```css
/* === Public Header === */
.public-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-primary);
  position: sticky;
  top: 0;
  z-index: 10;
}

.brand-logo {
  font-weight: 700;
  font-size: 18px;
  color: var(--text-primary);
}

.brand-logo span {
  color: var(--brand);
}

.header-link {
  font-size: 13px;
  color: var(--text-muted);
}

.header-actions {
  display: flex;
  gap: 16px;
  align-items: center;
}

/* === Asset Page === */
.asset-page {
  padding: 24px 20px 40px;
  max-width: 640px;
  margin: 0 auto;
}

.asset-hero {
  margin-bottom: 24px;
}

.asset-title {
  font-size: 24px;
  color: var(--text-primary);
  margin: 12px 0 8px;
}

.asset-description {
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 20px;
}

.asset-info-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.asset-info-pill {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 10px 16px;
  font-size: 13px;
  flex: 1;
  min-width: 120px;
}

.asset-info-label {
  color: var(--text-muted);
  margin-bottom: 2px;
}

.asset-info-value {
  font-weight: 600;
  color: var(--text-primary);
}

/* === Assets Marketplace Grid === */
.assets-page {
  padding: 24px 20px;
  max-width: 960px;
  margin: 0 auto;
}

.assets-page-title {
  font-size: 22px;
  margin-bottom: 4px;
}

.assets-page-subtitle {
  font-size: 14px;
  color: var(--text-muted);
  margin-bottom: 24px;
}

.assets-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 640px) {
  .assets-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .assets-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.asset-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
  cursor: pointer;
  transition: box-shadow 0.15s;
}

.asset-card:hover {
  box-shadow: var(--shadow-elevated);
}

.asset-card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 10px 0 6px;
}

.asset-card-description {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 12px;
}

.asset-card-footer {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-muted);
}

/* === Contact Form === */
.contact-form {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 24px;
}

.contact-slot-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--brand-light);
  border-radius: var(--radius-sm);
  margin-bottom: 20px;
}

.contact-slot-label {
  font-size: 12px;
  color: var(--brand-dark);
}

.contact-slot-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.contact-change-link {
  font-size: 13px;
  color: var(--brand);
  font-weight: 600;
  text-decoration: underline;
  background: none;
  border: none;
  cursor: pointer;
}

.contact-field {
  margin-bottom: 16px;
}

.contact-note {
  text-align: center;
  font-size: 12px;
  color: var(--text-dimmed);
  margin-top: 12px;
}

/* === Login Page === */
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100dvh - 60px);
  padding: 20px;
}

.login-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 32px;
  width: 100%;
  max-width: 380px;
}

.login-title {
  font-size: 20px;
  margin-bottom: 4px;
}

.login-subtitle {
  font-size: 14px;
  color: var(--text-muted);
  margin-bottom: 24px;
}
```

- [ ] **Step 3: Verify compilation**

Run: `cd /Users/thabomollomponya/Dev/scanYa && npm run typecheck`
Expected: No TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ContactForm.tsx apps/web/src/styles/public.css
git commit -m "feat: add contact form component and public track styles"
```

---

## Task 6: Workspace Shared Components

**Files:**
- Create: `apps/web/src/components/BookingCard.tsx`
- Create: `apps/web/src/components/StatCard.tsx`
- Create: `apps/web/src/components/StatusPill.tsx`

- [ ] **Step 1: Create StatusPill component**

Create `apps/web/src/components/StatusPill.tsx`:

```tsx
import type { BookingStatus } from "@scanya/shared";

const STATUS_STYLES: Record<BookingStatus, { bg: string; color: string; label: string }> = {
  pending: { bg: "var(--brand-light)", color: "var(--brand)", label: "Pending" },
  confirmed: { bg: "var(--success-light)", color: "var(--success)", label: "Confirmed" },
  rejected: { bg: "var(--danger-light)", color: "var(--danger)", label: "Rejected" },
  cancelled: { bg: "var(--neutral-bg)", color: "var(--text-muted)", label: "Cancelled" },
  completed: { bg: "var(--neutral-bg)", color: "var(--text-muted)", label: "Completed" },
};

export function StatusPill({ status }: { status: BookingStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className="status-pill"
      style={{ background: style.bg, color: style.color }}
    >
      {style.label}
    </span>
  );
}
```

- [ ] **Step 2: Create StatCard component**

Create `apps/web/src/components/StatCard.tsx`:

```tsx
type Props = {
  label: string;
  value: number;
  variant?: "default" | "brand" | "success";
};

const VARIANT_CLASSES: Record<string, string> = {
  default: "stat-card",
  brand: "stat-card stat-card--brand",
  success: "stat-card stat-card--success",
};

export function StatCard({ label, value, variant = "default" }: Props) {
  return (
    <div className={VARIANT_CLASSES[variant]}>
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value">{value}</div>
    </div>
  );
}
```

- [ ] **Step 3: Create BookingCard component**

Create `apps/web/src/components/BookingCard.tsx`:

```tsx
import type { Booking } from "@scanya/shared";
import { StatusPill } from "./StatusPill";

type Props = {
  booking: Booking;
  assetTitle?: string;
  showActions?: boolean;
  onConfirm?: () => void;
  onReject?: () => void;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string) {
  const colors = [
    { bg: "#FFF0E8", color: "#E8734A" },
    { bg: "#E8F0FF", color: "#4A6FE8" },
    { bg: "#F5EEF8", color: "#8E4AB5" },
    { bg: "#E8F5EE", color: "#2D7A4F" },
    { bg: "#FFF5E0", color: "#C4870A" },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

export function BookingCard({
  booking,
  assetTitle,
  showActions = false,
  onConfirm,
  onReject,
}: Props) {
  const avatar = getAvatarColor(booking.contactName);
  const initials = getInitials(booking.contactName);

  return (
    <div className="booking-card">
      <div className="booking-card-main">
        <div className="booking-card-requester">
          <div
            className="booking-card-avatar"
            style={{ background: avatar.bg, color: avatar.color }}
          >
            {initials}
          </div>
          <div>
            <div className="booking-card-name">{booking.contactName}</div>
            <div className="booking-card-email">{booking.contactEmail}</div>
          </div>
        </div>

        <div className="booking-card-details">
          {assetTitle && (
            <div className="booking-card-detail">
              <strong>Asset:</strong> {assetTitle}
            </div>
          )}
          <div className="booking-card-detail">
            <strong>When:</strong> {formatDateTime(booking.startAt)},{" "}
            {formatTime(booking.startAt)} &ndash; {formatTime(booking.endAt)}
          </div>
        </div>

        {booking.notes && (
          <div className="booking-card-notes">{booking.notes}</div>
        )}

        {booking.status !== "pending" && <StatusPill status={booking.status} />}
      </div>

      {showActions && booking.status === "pending" && (
        <div className="booking-card-actions">
          <button className="btn btn-success" onClick={onConfirm}>
            Confirm
          </button>
          <button className="btn btn-danger-outline" onClick={onReject}>
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify compilation**

Run: `cd /Users/thabomollomponya/Dev/scanYa && npm run typecheck`
Expected: No TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/BookingCard.tsx apps/web/src/components/StatCard.tsx apps/web/src/components/StatusPill.tsx
git commit -m "feat: add BookingCard, StatCard, and StatusPill workspace components"
```

---

## Task 7: Workspace Styles

**Files:**
- Modify: `apps/web/src/styles/workspace.css`

- [ ] **Step 1: Write workspace CSS**

Replace `apps/web/src/styles/workspace.css`:

```css
/* === Workspace Layout === */
.workspace-layout {
  display: flex;
  min-height: 100dvh;
}

/* Desktop sidebar */
.workspace-sidebar {
  width: 220px;
  background: var(--sidebar-bg);
  padding: 24px 0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 20;
}

.sidebar-logo {
  padding: 0 20px 24px;
  font-weight: 700;
  font-size: 18px;
  color: var(--text-white);
}

.sidebar-logo span {
  color: var(--brand);
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
}

.sidebar-link {
  padding: 10px 20px;
  color: var(--text-dimmed);
  font-size: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-decoration: none;
}

.sidebar-link:hover {
  color: var(--text-white);
}

.sidebar-link--active {
  background: rgba(232, 115, 74, 0.15);
  border-left: 3px solid var(--brand);
  color: var(--text-white);
  font-weight: 600;
}

.sidebar-badge {
  background: var(--brand);
  color: var(--text-white);
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
}

.sidebar-user {
  margin-top: auto;
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-user-name {
  font-size: 13px;
  color: var(--text-white);
  font-weight: 500;
}

.sidebar-user-role {
  font-size: 11px;
  color: var(--text-dimmed);
}

.sidebar-signout {
  font-size: 12px;
  color: var(--text-dimmed);
  margin-top: 8px;
  cursor: pointer;
  background: none;
  border: none;
}

.sidebar-signout:hover {
  color: var(--text-white);
}

/* Main content area */
.workspace-main {
  flex: 1;
  margin-left: 220px;
  padding: 28px 32px;
  background: var(--bg-workspace);
  min-height: 100dvh;
}

/* Mobile bottom tabs */
.workspace-bottom-tabs {
  display: none;
}

@media (max-width: 1024px) {
  .workspace-sidebar {
    display: none;
  }

  .workspace-main {
    margin-left: 0;
    padding: 20px 16px 80px;
  }

  .workspace-bottom-tabs {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--sidebar-bg);
    z-index: 20;
    padding: 8px 0;
    justify-content: space-around;
  }

  .tab-link {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 6px 12px;
    color: var(--text-dimmed);
    font-size: 10px;
    text-decoration: none;
    position: relative;
    min-width: 44px;
    min-height: 44px;
    justify-content: center;
  }

  .tab-link--active {
    color: var(--brand);
  }

  .tab-icon {
    font-size: 18px;
  }

  .tab-badge {
    position: absolute;
    top: 2px;
    right: 4px;
    background: var(--brand);
    color: var(--text-white);
    font-size: 9px;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 8px;
  }
}

/* === Dashboard === */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 28px;
  flex-wrap: wrap;
  gap: 12px;
}

.dashboard-greeting {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
}

.dashboard-subtitle {
  font-size: 14px;
  color: var(--text-muted);
}

.stats-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin-bottom: 28px;
}

@media (min-width: 640px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .stats-row {
    grid-template-columns: repeat(3, 1fr);
  }
}

.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 18px;
}

.stat-card--brand {
  background: var(--brand-light);
  border-color: var(--brand-border);
}

.stat-card--success {
  background: var(--success-light);
  border-color: var(--success-border);
}

.stat-card-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.stat-card--brand .stat-card-label {
  color: var(--brand-dark);
}

.stat-card--success .stat-card-label {
  color: var(--success);
}

.stat-card-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-card--brand .stat-card-value {
  color: var(--brand);
}

.stat-card--success .stat-card-value {
  color: var(--success);
}

/* === Section Headers === */
.section-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.section-subtitle {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 16px;
}

/* === Booking Card === */
.booking-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 18px;
  margin-bottom: 12px;
}

.booking-card-main {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.booking-card-requester {
  display: flex;
  align-items: center;
  gap: 10px;
}

.booking-card-avatar {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
}

.booking-card-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.booking-card-email {
  font-size: 12px;
  color: var(--text-muted);
}

.booking-card-details {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--text-secondary);
  flex-wrap: wrap;
}

.booking-card-detail strong {
  color: var(--text-primary);
}

.booking-card-notes {
  font-size: 13px;
  color: var(--text-muted);
  background: var(--bg-primary);
  padding: 8px 12px;
  border-radius: var(--radius-xs);
  border-left: 3px solid var(--border);
}

.booking-card-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

@media (min-width: 1024px) {
  .booking-card {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .booking-card-actions {
    margin-top: 0;
    flex-shrink: 0;
  }
}

/* === Status Pill === */
.status-pill {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 20px;
}

/* === Filter Tabs === */
.filter-tabs {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  margin-bottom: 20px;
  -webkit-overflow-scrolling: touch;
}

.filter-tab {
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  border-radius: var(--radius-xs);
  white-space: nowrap;
  background: none;
  border: none;
  cursor: pointer;
  min-height: 44px;
}

.filter-tab--active {
  color: var(--brand);
  background: var(--brand-light);
  font-weight: 600;
}

/* === Asset Management Cards === */
.workspace-asset-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 18px;
  margin-bottom: 12px;
}

.workspace-asset-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.workspace-asset-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.workspace-asset-meta {
  font-size: 13px;
  color: var(--text-muted);
  display: flex;
  gap: 16px;
}

.workspace-asset-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

/* === Empty State === */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted);
  font-size: 14px;
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd /Users/thabomollomponya/Dev/scanYa && npm run typecheck`
Expected: No TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/styles/workspace.css
git commit -m "feat: add workspace track styles with sidebar, bottom tabs, cards"
```

---

## Task 8: Public Layout and Pages

**Files:**
- Modify: `apps/web/src/layouts/PublicLayout.tsx`
- Modify: `apps/web/src/pages/AssetsPage.tsx`
- Modify: `apps/web/src/pages/AssetDetailPage.tsx`
- Create: `apps/web/src/pages/LoginPage.tsx`
- Delete: `apps/web/src/components/AuthPanel.tsx`
- Delete: `apps/web/src/pages/EventsPage.tsx`
- Delete: `apps/web/src/pages/EventDetailPage.tsx`
- Delete: `apps/web/src/pages/HomePage.tsx`

- [ ] **Step 1: Rewrite PublicLayout**

Replace the content of `apps/web/src/layouts/PublicLayout.tsx`:

```tsx
import { Link, Outlet } from "react-router-dom";

export function PublicLayout() {
  return (
    <div>
      <header className="public-header">
        <Link to="/assets" className="brand-logo">
          scan<span>Ya</span>
        </Link>
        <div className="header-actions">
          <Link to="/assets" className="header-link">
            Browse Assets
          </Link>
          <Link to="/app/login" className="header-link">
            Owner Login
          </Link>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite AssetsPage (marketplace)**

Replace the content of `apps/web/src/pages/AssetsPage.tsx`:

```tsx
import { Link } from "react-router-dom";
import { useAppState } from "../state/AppContext";

export function AssetsPage() {
  const { assets } = useAppState();

  return (
    <div className="assets-page">
      <h1 className="assets-page-title">Browse Assets</h1>
      <p className="assets-page-subtitle">Find and book what you need</p>

      <div className="assets-grid">
        {assets.map((asset) => (
          <Link
            key={asset.id}
            to={`/assets/${asset.id}`}
            className="asset-card"
          >
            <span className="category-pill">{asset.category}</span>
            <h3 className="asset-card-title">{asset.title}</h3>
            <p className="asset-card-description">{asset.description}</p>
            <div className="asset-card-footer">
              <span>{asset.location}</span>
              <span>{asset.priceLabel}</span>
            </div>
          </Link>
        ))}

        {assets.length === 0 && (
          <div className="empty-state">No assets available yet.</div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Rewrite AssetDetailPage with BookingCalendar**

Replace the content of `apps/web/src/pages/AssetDetailPage.tsx`:

```tsx
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAppState } from "../state/AppContext";
import { BookingCalendar } from "../components/BookingCalendar";

export function AssetDetailPage() {
  const { assetId, token } = useParams();
  const { assets, refreshAssets } = useAppState();

  useEffect(() => {
    if (assets.length === 0) {
      refreshAssets();
    }
  }, [assets.length, refreshAssets]);

  // For QR routes, we'd resolve the token to an assetId via the API.
  // For now, find the asset directly.
  const asset = assets.find((a) => a.id === assetId || a.id === token);

  if (!asset) {
    return (
      <div className="asset-page">
        <div className="empty-state">Asset not found.</div>
      </div>
    );
  }

  return (
    <div className="asset-page">
      <div className="asset-hero">
        <span className="category-pill">{asset.category}</span>
        <h1 className="asset-title">{asset.title}</h1>
        <p className="asset-description">{asset.description}</p>

        <div className="asset-info-row">
          <div className="asset-info-pill">
            <div className="asset-info-label">Location</div>
            <div className="asset-info-value">{asset.location}</div>
          </div>
          <div className="asset-info-pill">
            <div className="asset-info-label">Min. notice</div>
            <div className="asset-info-value">{asset.minimumNoticeHours}h</div>
          </div>
          <div className="asset-info-pill">
            <div className="asset-info-label">Min. rental</div>
            <div className="asset-info-value">{asset.minimumRentalHours}h</div>
          </div>
          <div className="asset-info-pill">
            <div className="asset-info-label">Price</div>
            <div className="asset-info-value">{asset.priceLabel}</div>
          </div>
        </div>
      </div>

      <BookingCalendar assetId={asset.id} assetTitle={asset.title} />
    </div>
  );
}
```

- [ ] **Step 4: Create LoginPage**

Create `apps/web/src/pages/LoginPage.tsx`:

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "../state/AppContext";

export function LoginPage() {
  const { signIn, setLoginForm, loginForm, message } = useAppState();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await signIn(e);
    setSubmitting(false);
    navigate("/app");
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h2 className="login-title">Owner Login</h2>
        <p className="login-subtitle">
          Sign in to manage your assets and bookings
        </p>

        {message && (
          <p style={{ color: "var(--danger)", fontSize: 13, marginBottom: 16 }}>
            {message}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <div className="contact-field">
            <label className="input-label" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              className="input"
              type="email"
              required
              value={loginForm.email}
              onChange={(e) =>
                setLoginForm({ ...loginForm, email: e.target.value })
              }
            />
          </div>

          <div className="contact-field">
            <label className="input-label" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              className="input"
              type="password"
              required
              value={loginForm.password}
              onChange={(e) =>
                setLoginForm({ ...loginForm, password: e.target.value })
              }
            />
          </div>

          <button
            className="btn-brand-lg"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Delete removed files**

Delete:
- `apps/web/src/components/AuthPanel.tsx`
- `apps/web/src/pages/EventsPage.tsx`
- `apps/web/src/pages/EventDetailPage.tsx`
- `apps/web/src/pages/HomePage.tsx`

- [ ] **Step 6: Verify compilation**

Run: `cd /Users/thabomollomponya/Dev/scanYa && npm run typecheck`
Expected: May have errors from App.tsx still importing deleted files — that's OK, we fix routing in Task 10.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/layouts/PublicLayout.tsx apps/web/src/pages/AssetsPage.tsx apps/web/src/pages/AssetDetailPage.tsx apps/web/src/pages/LoginPage.tsx
git rm apps/web/src/components/AuthPanel.tsx apps/web/src/pages/EventsPage.tsx apps/web/src/pages/EventDetailPage.tsx apps/web/src/pages/HomePage.tsx
git commit -m "feat: rewrite public pages with warm design, anonymous booking, login page"
```

---

## Task 9: Workspace Layout and Pages

**Files:**
- Modify: `apps/web/src/layouts/WorkspaceLayout.tsx`
- Modify: `apps/web/src/pages/WorkspaceDashboardPage.tsx`
- Modify: `apps/web/src/pages/WorkspaceAssetsPage.tsx`
- Modify: `apps/web/src/pages/WorkspaceBookingsPage.tsx`
- Modify: `apps/web/src/pages/WorkspaceQrPage.tsx`
- Modify: `apps/web/src/pages/ProfilePage.tsx`

- [ ] **Step 1: Rewrite WorkspaceLayout with sidebar + bottom tabs**

Replace the content of `apps/web/src/layouts/WorkspaceLayout.tsx`:

```tsx
import { NavLink, Navigate, Outlet } from "react-router-dom";
import { useAppState } from "../state/AppContext";

export function WorkspaceLayout() {
  const { session, signOut, ownerBookings } = useAppState();

  if (!session) {
    return <Navigate to="/app/login" replace />;
  }

  const pendingCount = ownerBookings.filter((b) => b.status === "pending").length;

  return (
    <div className="workspace-layout">
      {/* Desktop sidebar */}
      <aside className="workspace-sidebar">
        <div className="sidebar-logo">
          scan<span>Ya</span>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/app"
            end
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "sidebar-link--active" : ""}`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/app/assets"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "sidebar-link--active" : ""}`
            }
          >
            My Assets
          </NavLink>
          <NavLink
            to="/app/bookings"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "sidebar-link--active" : ""}`
            }
          >
            Bookings
            {pendingCount > 0 && (
              <span className="sidebar-badge">{pendingCount}</span>
            )}
          </NavLink>
          <NavLink
            to="/app/qr"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "sidebar-link--active" : ""}`
            }
          >
            QR Codes
          </NavLink>
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-user-name">{session.user.name}</div>
          <div className="sidebar-user-role">Asset Owner</div>
          <button className="sidebar-signout" onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="workspace-main">
        <Outlet />
      </div>

      {/* Mobile bottom tabs */}
      <nav className="workspace-bottom-tabs">
        <NavLink
          to="/app"
          end
          className={({ isActive }) =>
            `tab-link ${isActive ? "tab-link--active" : ""}`
          }
        >
          <span className="tab-icon">&#8962;</span>
          Home
        </NavLink>
        <NavLink
          to="/app/assets"
          className={({ isActive }) =>
            `tab-link ${isActive ? "tab-link--active" : ""}`
          }
        >
          <span className="tab-icon">&#9634;</span>
          Assets
        </NavLink>
        <NavLink
          to="/app/bookings"
          className={({ isActive }) =>
            `tab-link ${isActive ? "tab-link--active" : ""}`
          }
        >
          <span className="tab-icon">&#128197;</span>
          Bookings
          {pendingCount > 0 && <span className="tab-badge">{pendingCount}</span>}
        </NavLink>
        <NavLink
          to="/app/qr"
          className={({ isActive }) =>
            `tab-link ${isActive ? "tab-link--active" : ""}`
          }
        >
          <span className="tab-icon">&#9641;</span>
          QR
        </NavLink>
        <NavLink
          to="/app/profile"
          className={({ isActive }) =>
            `tab-link ${isActive ? "tab-link--active" : ""}`
          }
        >
          <span className="tab-icon">&#9787;</span>
          Profile
        </NavLink>
      </nav>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite WorkspaceDashboardPage**

Replace the content of `apps/web/src/pages/WorkspaceDashboardPage.tsx`:

```tsx
import { Link } from "react-router-dom";
import { useAppState } from "../state/AppContext";
import { StatCard } from "../components/StatCard";
import { BookingCard } from "../components/BookingCard";

export function WorkspaceDashboardPage() {
  const { session, assets, ownerBookings, updateBookingDecision } =
    useAppState();

  const publishedCount = assets.filter(
    (a) => a.ownerId === session?.user.id && a.status === "published",
  ).length;

  const pendingBookings = ownerBookings.filter((b) => b.status === "pending");
  const confirmedThisMonth = ownerBookings.filter((b) => {
    if (b.status !== "confirmed") return false;
    const bookingMonth = b.createdAt.slice(0, 7);
    const currentMonth = new Date().toISOString().slice(0, 7);
    return bookingMonth === currentMonth;
  }).length;

  const getAssetTitle = (assetId: string) =>
    assets.find((a) => a.id === assetId)?.title ?? "Unknown asset";

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-greeting">
            Good morning, {session?.user.name.split(" ")[0]}
          </h1>
          <p className="dashboard-subtitle">
            {pendingBookings.length > 0
              ? `You have ${pendingBookings.length} pending booking request${pendingBookings.length > 1 ? "s" : ""}`
              : "No pending requests"}
          </p>
        </div>
        <Link to="/app/assets" className="btn btn-brand">
          + New Asset
        </Link>
      </div>

      <div className="stats-row">
        <StatCard label="Published Assets" value={publishedCount} />
        <StatCard
          label="Pending Requests"
          value={pendingBookings.length}
          variant="brand"
        />
        <StatCard
          label="Confirmed This Month"
          value={confirmedThisMonth}
          variant="success"
        />
      </div>

      {pendingBookings.length > 0 && (
        <div>
          <h2 className="section-title">Pending Requests</h2>
          <p className="section-subtitle">
            These people want to rent your assets
          </p>
          {pendingBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              assetTitle={getAssetTitle(booking.assetId)}
              showActions
              onConfirm={() => updateBookingDecision(booking.id, "confirm")}
              onReject={() => updateBookingDecision(booking.id, "reject")}
            />
          ))}
        </div>
      )}

      {pendingBookings.length === 0 && (
        <div className="empty-state">
          All caught up! No pending booking requests.
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Rewrite WorkspaceBookingsPage with filter tabs**

Replace the content of `apps/web/src/pages/WorkspaceBookingsPage.tsx`:

```tsx
import { useState } from "react";
import { useAppState } from "../state/AppContext";
import { BookingCard } from "../components/BookingCard";
import type { BookingStatus } from "@scanya/shared";

const FILTERS: { label: string; value: BookingStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Rejected", value: "rejected" },
  { label: "Completed", value: "completed" },
];

export function WorkspaceBookingsPage() {
  const { ownerBookings, assets, updateBookingDecision } = useAppState();
  const [filter, setFilter] = useState<BookingStatus | "all">("all");

  const filtered =
    filter === "all"
      ? ownerBookings
      : ownerBookings.filter((b) => b.status === filter);

  const getAssetTitle = (assetId: string) =>
    assets.find((a) => a.id === assetId)?.title ?? "Unknown asset";

  return (
    <div>
      <h1 className="section-title" style={{ fontSize: 22, marginBottom: 16 }}>
        Bookings
      </h1>

      <div className="filter-tabs">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            className={`filter-tab ${filter === f.value ? "filter-tab--active" : ""}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.map((booking) => (
        <BookingCard
          key={booking.id}
          booking={booking}
          assetTitle={getAssetTitle(booking.assetId)}
          showActions={booking.status === "pending"}
          onConfirm={() => updateBookingDecision(booking.id, "confirm")}
          onReject={() => updateBookingDecision(booking.id, "reject")}
        />
      ))}

      {filtered.length === 0 && (
        <div className="empty-state">
          {filter === "all"
            ? "No bookings yet."
            : `No ${filter} bookings.`}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Rewrite WorkspaceAssetsPage**

Replace the content of `apps/web/src/pages/WorkspaceAssetsPage.tsx`:

```tsx
import { useAppState } from "../state/AppContext";
import { StatusPill } from "../components/StatusPill";

export function WorkspaceAssetsPage() {
  const { assets, session, assetForm, setAssetForm, createAsset } =
    useAppState();

  const myAssets = assets.filter((a) => a.ownerId === session?.user.id);

  return (
    <div>
      <div className="dashboard-header">
        <h1 className="section-title" style={{ fontSize: 22 }}>My Assets</h1>
      </div>

      {/* Create form */}
      <div className="workspace-asset-card" style={{ marginBottom: 24 }}>
        <h3 className="section-title">Create New Asset</h3>
        <form
          onSubmit={createAsset}
          style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="input-label">Title</label>
              <input
                className="input"
                value={assetForm.title}
                onChange={(e) => setAssetForm({ ...assetForm, title: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="input-label">Category</label>
              <input
                className="input"
                value={assetForm.category}
                onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })}
                required
              />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="input-label">Location</label>
              <input
                className="input"
                value={assetForm.location}
                onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="input-label">Price label</label>
              <input
                className="input"
                value={assetForm.priceLabel}
                onChange={(e) => setAssetForm({ ...assetForm, priceLabel: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <label className="input-label">Description</label>
            <textarea
              className="input"
              rows={3}
              value={assetForm.description}
              onChange={(e) => setAssetForm({ ...assetForm, description: e.target.value })}
              required
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="input-label">Min. notice (hours)</label>
              <input
                className="input"
                type="number"
                value={assetForm.minimumNoticeHours}
                onChange={(e) =>
                  setAssetForm({ ...assetForm, minimumNoticeHours: Number(e.target.value) })
                }
                required
              />
            </div>
            <div>
              <label className="input-label">Min. rental (hours)</label>
              <input
                className="input"
                type="number"
                value={assetForm.minimumRentalHours}
                onChange={(e) =>
                  setAssetForm({ ...assetForm, minimumRentalHours: Number(e.target.value) })
                }
                required
              />
            </div>
          </div>
          <button className="btn btn-brand" type="submit">
            Create Asset
          </button>
        </form>
      </div>

      {/* Asset list */}
      {myAssets.map((asset) => (
        <div key={asset.id} className="workspace-asset-card">
          <div className="workspace-asset-header">
            <div>
              <span className="category-pill" style={{ marginRight: 8 }}>
                {asset.category}
              </span>
              <span className="workspace-asset-title">{asset.title}</span>
            </div>
            <StatusPill
              status={asset.status === "published" ? "confirmed" : "pending"}
            />
          </div>
          <div className="workspace-asset-meta">
            <span>{asset.location}</span>
            <span>{asset.priceLabel}</span>
          </div>
        </div>
      ))}

      {myAssets.length === 0 && (
        <div className="empty-state">No assets yet. Create your first one above.</div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Restyle WorkspaceQrPage**

Replace the content of `apps/web/src/pages/WorkspaceQrPage.tsx`:

```tsx
import { useAppState } from "../state/AppContext";

export function WorkspaceQrPage() {
  const { assets, session } = useAppState();
  const myAssets = assets.filter((a) => a.ownerId === session?.user.id);

  return (
    <div>
      <h1 className="section-title" style={{ fontSize: 22, marginBottom: 16 }}>
        QR Codes
      </h1>

      {myAssets.map((asset) => (
        <div key={asset.id} className="workspace-asset-card">
          <div className="workspace-asset-title">{asset.title}</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>
            Public route:{" "}
            <code style={{ background: "var(--neutral-bg)", padding: "2px 8px", borderRadius: 4 }}>
              /q/[token]
            </code>
          </div>
        </div>
      ))}

      {myAssets.length === 0 && (
        <div className="empty-state">Create an asset first to generate QR codes.</div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Restyle ProfilePage**

Replace the content of `apps/web/src/pages/ProfilePage.tsx`:

```tsx
import { useAppState } from "../state/AppContext";

export function ProfilePage() {
  const { session, signOut } = useAppState();

  if (!session) return null;

  return (
    <div>
      <h1 className="section-title" style={{ fontSize: 22, marginBottom: 16 }}>
        Profile
      </h1>

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
          <button
            className="btn btn-danger-outline"
            style={{ alignSelf: "flex-start", marginTop: 8 }}
            onClick={signOut}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Verify compilation**

Run: `cd /Users/thabomollomponya/Dev/scanYa && npm run typecheck`
Expected: May still have App.tsx routing errors — fixed in next task.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/layouts/WorkspaceLayout.tsx apps/web/src/pages/WorkspaceDashboardPage.tsx apps/web/src/pages/WorkspaceAssetsPage.tsx apps/web/src/pages/WorkspaceBookingsPage.tsx apps/web/src/pages/WorkspaceQrPage.tsx apps/web/src/pages/ProfilePage.tsx
git commit -m "feat: rewrite workspace with sidebar nav, dashboard, booking cards"
```

---

## Task 10: Update Routing

**Files:**
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Rewrite App.tsx with updated routes**

Replace the content of `apps/web/src/App.tsx`:

```tsx
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider } from "./state/AppContext";
import { PublicLayout } from "./layouts/PublicLayout";
import { WorkspaceLayout } from "./layouts/WorkspaceLayout";
import { AssetsPage } from "./pages/AssetsPage";
import { AssetDetailPage } from "./pages/AssetDetailPage";
import { LoginPage } from "./pages/LoginPage";
import { WorkspaceDashboardPage } from "./pages/WorkspaceDashboardPage";
import { WorkspaceAssetsPage } from "./pages/WorkspaceAssetsPage";
import { WorkspaceBookingsPage } from "./pages/WorkspaceBookingsPage";
import { WorkspaceQrPage } from "./pages/WorkspaceQrPage";
import { ProfilePage } from "./pages/ProfilePage";
import "./styles/global.css";
import "./styles/public.css";
import "./styles/workspace.css";
import "./styles/calendar.css";

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Navigate to="/assets" replace />} />
        <Route path="/assets" element={<AssetsPage />} />
        <Route path="/assets/:assetId" element={<AssetDetailPage />} />
        <Route path="/q/:token" element={<AssetDetailPage />} />
      </Route>

      {/* Login (public, no layout chrome) */}
      <Route path="/app/login" element={<LoginPage />} />

      {/* Workspace routes */}
      <Route path="/app" element={<WorkspaceLayout />}>
        <Route index element={<WorkspaceDashboardPage />} />
        <Route path="assets" element={<WorkspaceAssetsPage />} />
        <Route path="bookings" element={<WorkspaceBookingsPage />} />
        <Route path="qr" element={<WorkspaceQrPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/assets" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}
```

- [ ] **Step 2: Verify full compilation**

Run: `cd /Users/thabomollomponya/Dev/scanYa && npm run typecheck`
Expected: No TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/App.tsx
git commit -m "feat: update routing — marketplace as home, login page, remove events"
```

---

## Task 11: Manual End-to-End Verification

**Files:** None (testing only)

- [ ] **Step 1: Start the API server**

Run: `cd /Users/thabomollomponya/Dev/scanYa && npm run dev:api`
Expected: "Server running on port 4000"

- [ ] **Step 2: Start the web dev server (separate terminal)**

Run: `cd /Users/thabomollomponya/Dev/scanYa && npm run dev:web`
Expected: Vite dev server on port 5173

- [ ] **Step 3: Test public booking flow**

1. Open `http://localhost:5173/assets` — should show the marketplace with at least one asset card
2. Click the asset card — should navigate to asset detail with info pills and calendar
3. Calendar shows month view — green dates for Fridays and Saturdays (demo data)
4. Click a green date — view toggles to day timeline with hourly slots
5. Click "Select" on an available slot — it turns orange with "Selected ✓"
6. Click "Continue →" — contact form appears with slot summary
7. Fill in name, email, notes — click "Request Booking →"
8. Success state shows with booking reference

- [ ] **Step 4: Test workspace flow**

1. Navigate to `http://localhost:5173/app/login`
2. Login with `owner@scanya.app` / `password123`
3. Dashboard shows with greeting, stat cards, and pending booking from step 3
4. Booking card shows requester name, email, asset, time, notes
5. Click "Confirm" — booking card updates
6. Check sidebar navigation works: Assets, Bookings, QR, Profile
7. On mobile viewport (< 640px): sidebar hidden, bottom tabs visible

- [ ] **Step 5: Test QR route**

1. Navigate to the QR route for the demo asset (check the QR codes page for the token)
2. Should land on the same asset detail page with booking calendar

- [ ] **Step 6: Commit any fixes found during testing**

```bash
git add -A
git commit -m "fix: address issues found during end-to-end testing"
```

Only create this commit if fixes were needed.
