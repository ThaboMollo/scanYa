# Event System Plan

## Goal
Enable event organizers to create events, configure visibility, generate QR access, and support attendee RSVPs.

## Scope
- Event CRUD
- Public and private visibility
- Event detail pages
- RSVP flow
- Event QR integration
- Linking assets to events

## User Stories
- As an organizer, I can create an event and decide whether it is public or private.
- As an organizer, I can generate a QR code for my event.
- As an attendee, I can view an event page and RSVP when allowed.
- As an organizer, I can associate booked or relevant assets with an event.

## Step-By-Step Plan
1. Define event entities.
   - `events` table: organizer ID, title, description, venue, start and end datetime, visibility, cover image, status.
   - `event_rsvps` table: event ID, attendee ID, RSVP status, guest count, notes.
   - `event_assets` table: event ID, asset ID, relationship type if needed.
2. Build organizer event CRUD APIs.
   - Create, update, list, publish, unpublish, and cancel events.
   - Enforce organizer ownership.
3. Build event creation UI.
   - Form sections: event details, schedule, visibility, cover media, and optional linked assets.
   - Validate dates, required fields, and visibility options.
4. Implement public and private event access rules.
   - Public events should be browsable later in discovery.
   - Private events should require direct link or QR access and optional authorization checks.
5. Build event detail page.
   - Show date, venue, description, media, RSVP action, and linked assets if intended.
   - Show organizer controls only to authorized users.
6. Implement RSVP workflow.
   - Allow attendees to RSVP to eligible events.
   - Prevent duplicate RSVPs or define update behavior.
   - Allow organizer to view RSVP counts and attendee list as permitted.
7. Integrate QR system.
   - Allow QR generation from the event management page.
   - Route scans to the event detail page.
8. Add asset-event linking.
   - Allow organizers to attach assets to events conceptually.
   - Decide whether linked assets are informational only or enforce booked ownership later.
9. Test event workflows.
   - Create and publish event
   - Private event access
   - RSVP
   - Event QR routing

## API Surface To Implement
- `POST /events`
- `GET /events/mine`
- `GET /events/:id`
- `PATCH /events/:id`
- `POST /events/:id/publish`
- `POST /events/:id/unpublish`
- `POST /events/:id/rsvp`
- `GET /events/:id/rsvps`

## Dependencies
- Requires user system and QR system support.
- Discovery hub depends on public event data from this module.

## Acceptance Criteria
- Organizers can manage events end to end.
- Public and private visibility behave correctly.
- Attendees can RSVP without confusion.
- Events can be accessed through QR codes.

## Implementation Notes For Agents
- Keep event visibility rules explicit and testable.
- Do not bundle payments or ticketing into the first event release unless the product scope changes.
- Link assets to events carefully so this does not block the booking-first roadmap.
