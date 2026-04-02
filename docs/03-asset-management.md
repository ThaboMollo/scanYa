# Asset Management Plan

## Goal
Allow asset owners to create, manage, and publish bookable assets such as mobile fridges and toilets.

## Scope
- Asset creation and editing
- Asset media
- Availability configuration
- Pricing and booking constraints
- Asset owner inventory dashboard

## User Stories
- As an asset owner, I can list an asset with details and availability.
- As an asset owner, I can update or temporarily unpublish an asset.
- As a user, I can view accurate asset details before requesting a booking.

## Step-By-Step Plan
1. Define the asset model.
   - Core fields: owner ID, title, category, description, location, status, images, capacity or quantity, pricing notes.
   - Add booking-related fields: minimum booking duration, notice period, cancellation rules, operating hours if applicable.
2. Build owner-side asset CRUD APIs.
   - Create endpoints to create, update, fetch, list, publish, unpublish, and archive assets.
   - Enforce ownership on all write operations.
3. Build asset creation UI.
   - Create a form with clear sections: basic info, pricing, availability, media, and publishing state.
   - Save drafts before publishing if the chosen stack supports it without excess complexity.
4. Implement media handling.
   - Add image upload support with validation for file type and size.
   - Store media URLs and metadata separately from asset core fields if helpful.
   - Generate fallback placeholders if no image exists.
5. Implement availability rules.
   - Create a simple model for recurring availability plus blocked dates.
   - Support start and end times for bookable windows.
   - Support manual blackout periods for maintenance or prior commitments.
6. Build owner inventory dashboard.
   - Show all owned assets with status, next booking, and booking counts.
   - Add filters for published, unpublished, and archived.
7. Build public asset detail page.
   - Show asset information, gallery, availability summary, and booking entry point.
   - Do not expose owner-only operational controls.
8. Add validation rules.
   - Prevent publishing if required fields are missing.
   - Prevent impossible availability rules such as inverted time ranges.
   - Validate images and category values.
9. Test asset workflows.
   - Create asset
   - Edit asset
   - Publish and unpublish
   - View asset publicly
   - Enforce owner-only updates

## API Surface To Implement
- `POST /assets`
- `GET /assets/mine`
- `GET /assets/:id`
- `PATCH /assets/:id`
- `POST /assets/:id/publish`
- `POST /assets/:id/unpublish`
- `POST /assets/:id/archive`

## Dependencies
- Requires user system and foundational storage support.
- Booking engine depends on asset availability and asset detail data.

## Acceptance Criteria
- Asset owners can manage inventory without direct database intervention.
- Public users can view asset details for published assets only.
- Availability rules are stored in a form usable by the booking engine.
- Hidden or archived assets cannot be booked.

## Implementation Notes For Agents
- Keep asset status separate from booking status.
- Model availability so the booking engine can compute conflicts server-side.
- Avoid embedding too much business logic only in the client calendar.
