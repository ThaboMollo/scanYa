# scanYa UI Overhaul — Design Spec

**Date:** 2026-04-02
**Approach:** Two-Track Design (separate public booking and owner workspace)
**Visual direction:** Warm & approachable (Airbnb/Calendly territory)
**Layout strategy:** Mobile-first, responsive

---

## 1. Design System

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#FFF9F5` | Page background (public) |
| `--bg-workspace` | `#FDFBF9` | Workspace content area |
| `--sidebar-bg` | `#2D2A26` | Workspace sidebar |
| `--text-primary` | `#2D2A26` | Headings, primary text |
| `--text-secondary` | `#6B6560` | Body text |
| `--text-muted` | `#8C8279` | Labels, hints |
| `--text-dimmed` | `#A89E95` | Disabled, placeholder |
| `--brand` | `#E8734A` | Primary actions, selected states, brand accent |
| `--brand-light` | `#FFF0E8` | Brand tint backgrounds |
| `--brand-border` | `#F5D0BB` | Brand-tinted borders |
| `--success` | `#2D7A4F` | Available slots, confirmations |
| `--success-light` | `#E8F5EE` | Success tint backgrounds |
| `--success-border` | `#B8E0CA` | Success-tinted borders |
| `--danger` | `#C44A3F` | Reject, destructive actions |
| `--danger-light` | `#FDF0EF` | Danger tint backgrounds |
| `--danger-border` | `#E8C0BC` | Danger-tinted borders |
| `--surface` | `#FFFFFF` | Cards, input backgrounds |
| `--border` | `#E8E0D8` | Default borders |
| `--border-light` | `#F0E6DD` | Subtle separators |
| `--neutral-bg` | `#F5F0EB` | Unavailable slots, disabled states |

### Typography

- **Font family:** System font stack (`system-ui, -apple-system, sans-serif`)
- **Headings:** 700 weight
- **Body:** 400 weight, `#6B6560`
- **Scale:** 12px (labels), 13px (small text), 14px (body), 15px (large body), 16px (section heads), 18px (page heads on mobile), 22px (page heads on desktop)

### Spacing & Radius

- **Border radius:** 8px (buttons, pills), 10px (inputs, small cards), 12px (medium cards), 14px (large cards, booking slots)
- **Spacing scale:** 4, 8, 12, 16, 20, 24, 28, 32px
- **Touch targets:** Minimum 44px height for interactive elements

### Shadows

- **Card shadow:** None by default, rely on borders for definition
- **Selected/active shadow:** `0 2px 8px rgba(232, 115, 74, 0.3)` (brand glow)
- **Elevated shadow:** `0 2px 12px rgba(232, 115, 74, 0.15)` (selected slots)

---

## 2. Layout Architecture

### Mobile-First Approach

All screens are designed for a ~375px mobile viewport first. Desktop layouts scale up using responsive breakpoints:

- **< 640px:** Single column, full-width components, bottom navigation for workspace
- **640px – 1024px:** Slightly wider cards, 2-column asset grid on marketplace
- **> 1024px:** Workspace sidebar visible, 3-column stat cards, wider content area

### Two-Track Structure

**Public track** (no auth required):
- Minimal header: logo left, "Browse more assets" link right
- Single-column content, full-width on mobile
- Pages: Asset detail (QR landing), Browse assets (marketplace)

**Workspace track** (auth required, asset owners):
- Mobile: bottom tab bar (Dashboard, Assets, Bookings, QR, Profile)
- Desktop: dark sidebar with navigation items
- Content area with warm background

---

## 3. Public Screens

### 3.1 Asset Page (QR Landing)

**Route:** `/q/:token` (QR entry) or `/assets/:assetId` (browse entry)

**Layout (top to bottom, single column):**

1. **Header:** Logo + "Browse more assets" link
2. **Asset hero:**
   - Category pill (e.g., "Mobile Fridge") — rounded, brand-light background, brand text
   - Title — large, bold
   - Description — secondary text color, 1.6 line height
3. **Info pills row** (horizontal scroll on mobile, wrap on desktop):
   - Location, Minimum notice, Minimum rental, Price
   - Each pill: white background, border, label on top, bold value below
4. **Booking section** — white card with border and 14px radius:
   - "Book this asset" heading
   - Calendar component (see 3.2 and 3.3)
   - After slot selection: contact form (see 3.4)
5. **Footer note:** "No account needed. The owner will confirm via your email."

**Behavior changes:**
- Remove the requirement for user login/registration to create a booking
- The booking API endpoint (`POST /bookings`) accepts bookings without auth when `contactName` and `contactEmail` are provided
- No role selection, no signup form on the public side

### 3.2 Calendar — Month View

**Embedded in the asset page booking section.**

**Layout:**
- Navigation row: back arrow, "April 2026" (bold, centered), forward arrow
- Day-of-week header row: Mo Tu We Th Fr Sa Su
- 5-6 row grid of day cells

**Day cell states:**
- **Available (has open slots):** Green background (`--success-light`), green dot indicator at bottom center, green text, bold weight, tappable
- **Unavailable (no rules set or fully booked):** Neutral background (`--neutral-bg`), muted text, not tappable
- **Past dates:** Dimmed text (`--text-dimmed`), not tappable
- **Other month spillover:** Very light text, not tappable
- **Selected (tapped):** Brand background (`--brand`), white text, brand shadow — then immediately toggles to day view

**Legend below grid:** Three items with color-coded squares — "Has open slots", "Unavailable", "Selected"

**Interaction:** Tapping a green (available) day replaces the month view with the day view (3.3). This is a full view swap, not a side-by-side or collapse.

### 3.3 Calendar — Day View

**Replaces the month view when a day is tapped.**

**Layout:**
- Back arrow + day header ("Saturday, 4 April") + slot summary ("3 slots - 2 available")
- Vertical timeline of hourly slots

**Each slot row:**
- Left column (56px): start time (bold) + end time (muted), right-aligned
- Colored vertical bar (3px wide, full slot height): green/orange/gray
- Slot card (fills remaining width, 14px radius):
  - **Available:** Green background, "Available" label, duration, "Select" button (green)
  - **Selected:** Brand-light background, 2px brand border, brand shadow, "Selected ✓" label, "Change" button (outline)
  - **Booked:** Neutral background, 50% opacity, "Booked" label, "Unavailable" text

**Summary bar at bottom:**
- Appears after a slot is selected
- White card: "Your booking" label, "Sat 4 Apr, 12:00 – 18:00" bold, duration
- "Continue →" button (brand color, right-aligned)

**Interaction:**
- Tapping back arrow returns to month view
- Tapping "Select" on an available slot marks it as selected
- Only one slot can be selected at a time
- "Continue" advances to the contact form (3.4)

### 3.4 Contact & Confirm Form

**Appears after tapping "Continue" from the day view. Replaces the calendar in the booking section.**

**Layout:**
1. **Selected slot summary** (non-editable): day, time range, duration + "Change" link (returns to calendar)
2. **Form fields:**
   - Your name (text input, required)
   - Your email (email input, required)
   - Notes (textarea, optional, placeholder: "Tell the owner about your event or needs")
3. **Submit button:** "Request Booking →" (full-width, brand color)

**Success state (replaces the form):**
- Checkmark icon or illustration
- "Booking request sent!"
- "The owner of [Asset Title] will review your request and contact you at [email]."
- "Booking reference: #[short-id]"
- Link: "Browse more assets"

### 3.5 Browse Assets (Marketplace)

**Route:** `/assets`

**Header:** Logo + "Browse Assets" (active, underlined) + "Owner Login" link

**Layout:**
- Page title: "Browse Assets" + subtitle "Find and book what you need"
- Asset card grid: 1 column on mobile, 2 on tablet, 3 on desktop

**Asset card:**
- Category pill (top left)
- Title (bold)
- Description (2-line clamp)
- Bottom row: location + price label
- Entire card is tappable → navigates to asset detail page

---

## 4. Workspace Screens

### 4.1 Navigation

**Mobile (< 640px):** Bottom tab bar with icons + labels
- Dashboard (home icon)
- Assets (grid icon)
- Bookings (calendar icon) + badge count for pending
- QR (qr-code icon)
- Profile (user icon)

**Desktop (≥ 1024px):** Fixed dark sidebar (220px wide)
- Logo at top
- Nav items: Dashboard, My Assets, Bookings (with badge), QR Codes
- User info at bottom: name + role

**Tablet (640px – 1024px):** Collapsed sidebar (icons only, 60px) or bottom tab bar

### 4.2 Dashboard

**Route:** `/app`

**Layout:**
1. **Header row:** Greeting ("Good morning, Thabo") + pending count subtitle + "+ New Asset" button
2. **Stat cards** (3 across on desktop, stacked on mobile):
   - Published Assets (white background, neutral)
   - Pending Requests (brand-light background, orange count)
   - Confirmed This Month (success-light background, green count)
3. **Pending Requests section:**
   - Section heading + subtitle ("These people want to rent your assets")
   - Booking request cards (see 4.4)

### 4.3 My Assets

**Route:** `/app/assets`

**Layout:**
1. **Header:** "My Assets" + "+ New Asset" button
2. **Asset list** (cards, single column on mobile, 2 columns on desktop):
   - Title, category pill, status pill (draft = gray, published = green)
   - Location, price label
   - Actions: Edit, Publish/Unpublish, Generate QR

**Create/edit asset form:**
- Inline form at the top of the page (or slide-up panel on mobile)
- Fields: title, category (text input), location, description, price label, minimum notice hours, minimum rental hours
- Save button: "Create Asset" or "Update Asset"

### 4.4 Booking Request Card

**Used on Dashboard and Bookings page.**

**Layout:**
- **Left: requester info**
  - Initials avatar (36px, colored background based on name hash)
  - Name (bold) + email below
- **Middle: booking details**
  - Asset name (bold label)
  - Date + time range
  - Notes (if any) in a quoted block: neutral background, left border accent
- **Right: action buttons** (on desktop; below the card on mobile)
  - Confirm (green solid button)
  - Reject (red outline button)

**Status variants (for non-pending bookings):**
- Confirmed: green status pill, no action buttons
- Rejected: red status pill, no action buttons
- Completed: gray status pill

### 4.5 Bookings Page

**Route:** `/app/bookings`

**Layout:**
1. **Filter tabs:** All | Pending | Confirmed | Rejected | Completed
   - Horizontal scroll on mobile
   - Active tab: brand underline
2. **Booking cards** (same as 4.4, with status pill)
3. **Empty state:** Friendly message per filter ("No pending requests" etc.)

### 4.6 QR Codes Page

**Route:** `/app/qr`

**Layout:**
1. **Header:** "QR Codes"
2. **Per asset:** Card showing asset title + QR route URL (`/q/:token`)
3. **Generate button** for assets without QR codes
4. **Note:** Actual QR image generation is not in Phase 1 scope — show the URL that would be encoded

### 4.7 Login Page

**Route:** `/app/login` (or modal overlay)

**Simple form:**
- Email + password inputs
- "Sign In" button (brand color)
- No public registration — owner accounts are created via the existing `POST /auth/register` endpoint (e.g., via API or a future admin flow). The login page is the only auth UI in Phase 1.

---

## 5. API Changes Required

### 5.1 Anonymous Booking

The current booking endpoint (`POST /bookings`) requires authentication. For the frictionless public booking flow:

- Allow `POST /bookings` without auth when `contactName` and `contactEmail` are provided
- When no auth token is present, `requesterId` is set to `null`
- All existing validation still applies (conflict detection, minimum notice, minimum rental)

### 5.2 Availability Response

The current availability endpoint returns raw windows and bookings. Enhance to return slot-level data:

- `GET /assets/:id/availability?month=2026-04` — new parameter to get availability summary for an entire month
- Response: `{ days: [{ date: "2026-04-03", hasOpenSlots: true, slotCount: 3 }, ...] }`
- Existing per-day endpoint remains for the day view drill-down

---

## 6. Responsive Breakpoints

| Breakpoint | Public | Workspace |
|-----------|--------|-----------|
| < 640px | Single column, full-width booking section | Bottom tab bar, stacked stat cards, full-width booking cards |
| 640px – 1024px | 2-column asset grid on marketplace | Collapsed sidebar or bottom tabs, 2-column stat cards |
| > 1024px | 3-column asset grid, centered content (max-width 960px) | Full sidebar (220px), 3-column stat cards, booking cards with inline actions |

---

## 7. Out of Scope

These items are explicitly excluded from this design:

- Events system (Phase 2)
- Email notifications (API stubs exist, no implementation)
- Payment processing (Phase 3)
- Search and filtering on marketplace
- Availability rule management UI (owners set rules via API)
- Dark mode
- Persistent database migration (stays in-memory for MVP)
- User registration for bookers (removed — no account needed)
- Password reset / email verification
- Asset image uploads

---

## 8. Key Behavioral Changes from Current Implementation

1. **Booking no longer requires authentication** — public users book with just name + email
2. **Calendar is a toggle, not a date picker** — month grid swaps to hourly day view on tap
3. **Workspace navigation moves from top tabs to sidebar** (desktop) / **bottom tabs** (mobile)
4. **Dashboard surfaces pending bookings** — no need to navigate to a separate bookings page
5. **Registration/role-selection form removed from public pages** — only owners log in via workspace
6. **Homepage replaced with marketplace** — browse assets is the primary public entry point alongside QR
7. **New API endpoint** for monthly availability summary to power the calendar month view
