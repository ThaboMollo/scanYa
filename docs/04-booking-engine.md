# Booking Engine Plan

## Goal
Deliver the booking-first core of the product: users must be able to see availability, request a slot, and receive a confirmation outcome from the owner.

## Scope
- Availability lookup
- Booking request flow
- Booking conflict prevention
- Booking status lifecycle
- Owner confirmation workflow
- Booking calendar views

## User Stories
- As a customer, I can check an asset's availability before booking.
- As a customer, I can submit a booking request for a valid slot.
- As an asset owner, I can confirm or reject pending bookings.
- As both parties, I can see booking status updates.

## Step-By-Step Plan
1. Define booking entities.
   - `bookings` table fields: asset ID, requester ID, start datetime, end datetime, status, contact details, notes, total price placeholder, source.
   - `booking_status_history` table for auditability.
   - Optionally include `event_id` when bookings are tied to events later.
2. Implement server-side availability calculation.
   - Build a service that reads asset availability rules, blackout windows, and existing bookings.
   - Return available slots for a requested date range.
   - Make the server authoritative for overlap checks.
3. Build public availability endpoint.
   - Accept asset ID and date range.
   - Return available and unavailable windows in a UI-friendly shape.
   - Avoid exposing private booking details.
4. Implement booking request creation.
   - Validate asset is published and bookable.
   - Validate requested times fall inside allowed windows.
   - Reject overlaps with confirmed bookings and, if desired, temporarily hold pending ones.
   - Persist booking as `pending`.
5. Implement owner review actions.
   - Create endpoints for confirm, reject, and cancel flows.
   - Record status changes in history.
   - Enforce ownership checks for owner actions.
6. Build booking UI.
   - Asset detail page should lead into slot selection.
   - Booking form should collect contact details, timing, and notes.
   - Show clear error states for conflicts or invalid windows.
7. Build owner booking management UI.
   - Calendar or list view for incoming bookings.
   - Filters by status and asset.
   - Quick actions for confirm and reject.
8. Build customer booking history UI.
   - Show submitted bookings and current statuses.
   - Add cancellation if the business rules allow it in MVP.
9. Add notification hooks.
   - On booking creation, queue owner notification.
   - On confirm or reject, queue customer notification.
10. Test concurrency and edge cases.
   - Simultaneous requests for same slot
   - Requests outside availability
   - Booking across blocked dates
   - Owner authorization failures
   - Timezone handling

## API Surface To Implement
- `GET /assets/:id/availability`
- `POST /bookings`
- `GET /bookings/mine`
- `GET /owner/bookings`
- `POST /bookings/:id/confirm`
- `POST /bookings/:id/reject`
- `POST /bookings/:id/cancel`

## Dependencies
- Requires user system and asset management.
- QR system depends on this module for its booking destination.
- Notification system should be integrated as soon as booking mutations exist.

## Acceptance Criteria
- Users can only book valid slots.
- Conflicting bookings are prevented server-side.
- Owners can confirm or reject pending bookings.
- Booking status is visible to both parties.
- Core booking flow works from asset page to confirmation email trigger.

## Implementation Notes For Agents
- This is the highest-priority module in the entire product.
- If scope pressure appears, keep the booking lifecycle simple rather than adding pricing or partial payments.
- Store times in a consistent server-side format and convert only at the UI edge.
