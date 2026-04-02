# QR System Plan

## Goal
Use QR codes as a fast entry point into booking and event experiences while keeping the underlying access secure and trackable.

## Scope
- QR generation
- QR scan routing
- Asset-linked booking entry
- Event-linked access
- Scan analytics

## User Stories
- As an asset owner, I can generate a QR code for a bookable asset.
- As a user, I can scan a QR code and land directly on the correct booking page.
- As the platform, I can track scan volume and destination performance.

## Step-By-Step Plan
1. Define QR code records.
   - Create `qr_codes` table with target type, target ID, slug or token, status, and scan counters.
   - Support at least two target types: `asset_booking` and `event_page`.
2. Implement QR generation service.
   - Generate a unique slug or token for each QR destination.
   - Produce an image or SVG representation for download or embedding.
   - Store the destination metadata rather than hardcoding direct URLs in multiple places.
3. Build asset QR generation flow.
   - Allow asset owners to generate or regenerate a QR code from asset management.
   - Route scans to the public asset booking page.
   - Preserve attribution that the visit came from a QR scan.
4. Build event QR generation flow.
   - Allow organizers to generate QR codes for public or private event pages.
   - For private events, require the destination page to validate access after scan.
5. Build QR redirect endpoint.
   - Resolve QR token to target.
   - Increment scan count or log a scan event.
   - Redirect to the correct web page or app route.
6. Add QR analytics capture.
   - Record scan timestamp, target type, target ID, and optional device metadata if privacy policy allows.
   - Expose aggregate counts per asset or event.
7. Build owner or organizer QR management UI.
   - Show current QR status and download option.
   - Allow deactivation and regeneration if a QR destination should no longer be used.
8. Handle invalid or disabled QR states.
   - Show a clear fallback page when QR is invalid, expired, or disabled.
   - Avoid leaking internal IDs in error responses.
9. Test QR flows.
   - Valid asset QR redirect
   - Valid event QR redirect
   - Disabled QR
   - Regenerated QR invalidating the previous token if required

## API Surface To Implement
- `POST /assets/:id/qr`
- `POST /events/:id/qr`
- `GET /q/:token`
- `GET /qr/:id`
- `POST /qr/:id/deactivate`

## Dependencies
- Depends on asset and event modules for targets.
- Analytics hooks can reuse shared observability from the foundation module.

## Acceptance Criteria
- Every published asset can have a QR entry point into booking.
- QR scans resolve reliably and quickly.
- Scan counts are measurable.
- Invalid or disabled QR codes fail safely.

## Implementation Notes For Agents
- QR should not bypass normal permission checks on the destination page.
- Use short, non-guessable public tokens.
- Preserve the source channel so conversions from QR can be measured later.
