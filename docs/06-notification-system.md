# Notification System Plan

## Goal
Send reliable emails for the booking lifecycle first, then expand to event and reminder notifications later.

## Scope
- Email templates
- Notification queueing
- Booking emails
- Event emails later
- Delivery tracking

## User Stories
- As an asset owner, I receive an email when a new booking request is submitted.
- As a customer, I receive an email when my booking is confirmed or rejected.
- As an organizer or attendee later, I receive event-related updates.

## Step-By-Step Plan
1. Define notification data model.
   - Create `notifications` table with type, recipient, payload, provider status, attempt count, and timestamps.
   - Store provider message IDs when available.
2. Implement notification job producer.
   - Add helper functions that enqueue notifications instead of sending synchronously in request handlers.
   - Ensure retries are idempotent.
3. Choose and integrate email provider.
   - Add provider SDK or API wrapper.
   - Centralize send logic so provider changes do not affect feature modules.
4. Create email templates for MVP.
   - New booking request to owner
   - Booking confirmed to requester
   - Booking rejected to requester
   - Optional account welcome email
5. Wire booking events to notifications.
   - On booking creation, enqueue owner email.
   - On confirm or reject, enqueue requester email.
   - Record template and payload used for traceability.
6. Build notification processing worker.
   - Poll queued notifications or subscribe to queue events.
   - Update delivery status after send attempts.
   - Mark failed notifications and capture error messages.
7. Build minimal operational visibility.
   - Add internal list or admin-facing debug view later if needed.
   - At minimum, keep statuses queryable in the database.
8. Expand for event notifications.
   - RSVP confirmations
   - Event updates
   - Event reminders
9. Test delivery flows.
   - Queue creation
   - Provider failure retry
   - Duplicate event suppression where needed
   - Template rendering with realistic payloads

## API Surface To Implement
- No major public API is required initially.
- Internal services should expose reusable helpers for enqueueing notifications.

## Dependencies
- Depends on foundation job processing.
- Booking engine is the first consumer.
- Event system becomes a later consumer.

## Acceptance Criteria
- Booking emails are reliably queued and sent.
- Failed sends are visible and retryable.
- Request-response latency is not blocked by email delivery.

## Implementation Notes For Agents
- Keep notification payloads structured and versionable.
- Do not bury provider-specific logic inside booking or event handlers.
- Treat email as eventually consistent, not synchronous business logic.
