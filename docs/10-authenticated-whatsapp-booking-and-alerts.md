# Authenticated WhatsApp Booking and System Alerts

## Goal

Add system alerts and a booking flow where users can browse published assets publicly, authenticate only when they choose to book, complete booking details, and submit the request through WhatsApp to the asset owner.

## Scope

This feature includes:

- Global system alerts for success, error, info, and warning states.
- Public browsing of published assets.
- Auth-gated booking start from an asset detail page.
- Booking form fields for who, where, and when.
- Booking persistence before WhatsApp handoff.
- WhatsApp redirect with a prefilled message to the asset owner.
- Owner WhatsApp contact management.
- Super admin compatibility for asset visibility and state management.

## Data Model Changes

### Profiles

Store the asset owner's WhatsApp number on the owner profile.

```sql
alter table public.profiles
add column if not exists whatsapp_number varchar(32);
```

The app should normalize WhatsApp numbers to an international digits-only format where possible, for example:

```txt
27821234567
```

Do not store spaces, `+`, or a local leading zero.

### Bookings

Add a booking location field so the WhatsApp message and booking record include where the asset is needed.

```sql
alter table public.bookings
add column if not exists location text;
```

### Optional Asset Override

If per-asset WhatsApp routing is needed later, add an asset-level override.

```sql
alter table public.assets
add column if not exists whatsapp_number varchar(32);
```

If both profile and asset WhatsApp numbers exist, use `assets.whatsapp_number` first, then fall back to `profiles.whatsapp_number`.

## Shared Types

Update profile/user types and mappers:

```ts
type PublicUser = {
  // existing fields
  whatsappNumber?: string | null;
};
```

Update booking types:

```ts
type Booking = {
  // existing fields
  location: string;
};
```

If using an asset booking detail response, include owner contact information:

```ts
type AssetBookingDetails = {
  asset: Asset;
  owner: {
    name: string;
    whatsappNumber: string | null;
  };
};
```

## System Alerts

Add app-level alerts to `AppContext`.

```ts
type SystemAlert = {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  createdAt: string;
};
```

Context API:

```ts
alerts: SystemAlert[];
pushAlert(type: SystemAlert["type"], message: string): void;
dismissAlert(id: string): void;
clearAlerts(): void;
```

Behavior:

- Show alerts globally, preferably top-right or top-center.
- Auto-dismiss `success` and `info` alerts after five seconds.
- Keep `error` and `warning` alerts visible until dismissed.
- Gradually replace the current `message` state with alerts.
- Use alerts for login success, booking errors, asset status updates, missing WhatsApp numbers, and WhatsApp redirect preparation.

## Public Asset Browsing

Public users can browse assets without authentication.

Rules:

- `/assets` shows only assets where `status = 'published'`.
- Draft and archived assets are hidden from public browsing.
- Owners and super admins can still see draft and archived assets in the workspace.

Published asset query:

```ts
supabase
  .from("assets")
  .select("*")
  .eq("status", "published");
```

Acceptance criteria:

- Unauthenticated users can visit `/assets`.
- Only published assets appear publicly.
- Selecting an asset opens the asset detail page.

## Auth-Gated Booking Start

Users should authenticate only when they choose to book.

Flow:

1. User visits `/assets/:assetId`.
2. User reviews asset details publicly.
3. User clicks a booking CTA or selects a slot.
4. If unauthenticated, store the intended destination and redirect to login.
5. After login, return the user to the selected asset and continue booking.

Suggested redirect URL:

```txt
/app/login?redirect=/assets/:assetId?booking=1
```

Use `sessionStorage` as a fallback for pending booking context:

```ts
sessionStorage.setItem("pendingBookingAssetId", assetId);
sessionStorage.setItem("postLoginRedirect", `/assets/${assetId}?booking=1`);
```

Login page behavior:

```ts
const redirect = searchParams.get("redirect") ?? "/app";

if (success) {
  navigate(redirect);
}
```

Acceptance criteria:

- Hard refresh does not log users out.
- Unauthenticated users are redirected to login only after initiating booking.
- After login, users return to the selected asset booking flow.

## Booking Form

The booking form should collect:

- `contactName`
- `contactEmail`
- `location`
- `startAt`
- `endAt`
- optional `notes`

For authenticated users, prefill:

```ts
contactName = session.user.name;
contactEmail = session.user.email;
```

Required new field:

```ts
location: string;
```

UI flow:

1. Select date.
2. Select available time slot.
3. Confirm name and email.
4. Enter location.
5. Add optional notes.
6. Submit booking.

## Booking Persistence

Create a booking record before redirecting to WhatsApp.

Reason:

- The system keeps a record even if the WhatsApp handoff fails.
- Owners can see pending bookings in the dashboard.
- Users and owners have a booking reference.

API payload:

```ts
{
  assetId: string;
  contactName: string;
  contactEmail: string;
  location: string;
  startAt: string;
  endAt: string;
  notes?: string;
}
```

Booking status:

```ts
status: "pending";
```

Because this flow requires authentication, anonymous email verification is not needed for this path.

## WhatsApp Redirect

After successful booking creation, redirect to WhatsApp using the asset owner's WhatsApp number.

URL format:

```ts
https://wa.me/{ownerWhatsappNumber}?text={encodedMessage}
```

Message template:

```txt
Hi, I would like to book {assetTitle}.

Who: {contactName}
Email: {contactEmail}
Where: {location}
When: {startAt} to {endAt}

Booking reference: {bookingId}
Notes: {notes}
```

Implementation sketch:

```ts
const message = [
  `Hi, I would like to book ${asset.title}.`,
  "",
  `Who: ${contactName}`,
  `Email: ${contactEmail}`,
  `Where: ${location}`,
  `When: ${formatDateTime(startAt)} to ${formatDateTime(endAt)}`,
  "",
  `Booking reference: ${booking.id}`,
  notes ? `Notes: ${notes}` : null,
].filter(Boolean).join("\n");

window.location.href = `https://wa.me/${ownerWhatsappNumber}?text=${encodeURIComponent(message)}`;
```

Validation:

- If no owner WhatsApp number exists, show a system alert.
- Do not redirect if the WhatsApp number is missing.
- Prefer blocking booking submission before creating the booking when no WhatsApp number exists.

Alert copy:

```txt
This asset owner has not added a WhatsApp number yet.
```

## Owner WhatsApp Management

Add a WhatsApp number field to `ProfilePage`.

Validation:

- Normalize input with `value.replace(/[^\d]/g, "")`.
- Store international digits-only numbers.
- Require WhatsApp number before publishing an asset.

Optional South African normalization:

```ts
function normalizeWhatsappNumber(value: string) {
  const digits = value.replace(/[^\d]/g, "");

  if (digits.startsWith("0")) {
    return `27${digits.slice(1)}`;
  }

  return digits;
}
```

## Asset Publishing Rule

Before publishing an asset, confirm the owner has a WhatsApp number.

API behavior:

- On `POST /assets/:id/publish`, load the owner profile.
- If `profiles.whatsapp_number` is missing, reject the publish request.

Response:

```json
{
  "error": "Add your WhatsApp number before publishing assets."
}
```

Recommended behavior:

- Apply the rule to both owners and super admins, because public booking depends on owner WhatsApp availability.
- Super admins can still move assets to draft or archived.

## API Changes

### `PATCH /me`

Support updating WhatsApp number:

```ts
{
  name?: string;
  company?: string;
  whatsappNumber?: string;
}
```

### `POST /bookings`

Update validation:

```ts
location: z.string().min(2)
```

Persist `location` into `bookings.location`.

### Asset Booking Details

Recommended endpoint:

```txt
GET /assets/:id/booking-details
```

Response:

```ts
{
  asset: Asset;
  owner: {
    name: string;
    whatsappNumber: string | null;
  };
}
```

Rules:

- Asset must be published.
- User must be authenticated before the owner WhatsApp number is returned.
- Do not expose WhatsApp numbers in public asset browse responses.

## Frontend Changes

### `AssetsPage`

- Continue showing published assets publicly.
- No auth required.

### `AssetDetailPage`

- Show asset details publicly.
- Start booking only after auth check.
- Redirect unauthenticated users to login with a return URL.

### `LoginPage`

- Read `redirect` query param.
- Navigate to redirect destination after successful login.

### `BookingCalendar`

- Require authenticated session before continuing to booking form.
- Keep selected date and slot when possible.

### `ContactForm`

- Add `location` field.
- Prefill `contactName` and `contactEmail` from the session.
- Submit booking through API.
- Redirect to WhatsApp after success.

### `ProfilePage`

- Add WhatsApp number field.
- Normalize and save it via `PATCH /me`.

### `WorkspaceAssetsPage`

- Publishing should surface an alert if WhatsApp number is missing.
- Owners can manage their own asset states.
- Super admins can manage any asset state.

## Security and RLS

Bookings should be created by authenticated users for this flow.

Recommended RLS update if anonymous bookings are no longer needed:

```sql
drop policy if exists "Anyone creates bookings" on public.bookings;

create policy "Authenticated users create bookings"
on public.bookings
for insert
to authenticated
with check (auth.uid() = requester_id);
```

If public QR bookings remain supported later, keep anonymous booking through a server-side endpoint using the service role instead of allowing public direct inserts.

## Privacy Decision

WhatsApp number exposure is required for WhatsApp redirect, but it should be limited.

Rules:

- Do not expose all owner WhatsApp numbers in public asset browse lists.
- Only expose the selected asset owner's WhatsApp number after authentication.
- Only expose it for published assets.

## Acceptance Criteria

1. System alerts display globally and can be dismissed.
2. Success and info alerts auto-dismiss after five seconds.
3. Public users can browse only published assets.
4. Public users are redirected to login only when starting a booking.
5. After login, users return to the selected asset booking flow.
6. Authenticated users can select date and time.
7. Authenticated users can enter location and optional notes.
8. Booking submit creates a pending booking record.
9. Submit redirects to WhatsApp with who, where, when, asset title, and booking reference.
10. Owners can save their WhatsApp number.
11. Assets cannot be published until the owner has a WhatsApp number.
12. Super admins can view and manage all assets, but WhatsApp booking still requires owner WhatsApp contact.

## Suggested Implementation Order

1. Add `whatsapp_number` to `profiles`.
2. Add `location` to `bookings`.
3. Update shared types and DB mappers.
4. Add profile WhatsApp editing.
5. Add global system alerts.
6. Add auth-aware booking redirect from asset detail to login and back.
7. Add booking form location field.
8. Add booking details lookup for authenticated users.
9. Add WhatsApp redirect after booking creation.
10. Add publish-time WhatsApp validation.
11. Tighten booking RLS if anonymous bookings are no longer required.
