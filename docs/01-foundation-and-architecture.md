# Foundation and Architecture Plan

## Goal
Create the technical base required for all later features without overbuilding. This module exists to make the booking-first MVP shippable and extensible.

## Scope
- Repository structure
- Environment configuration
- Shared domain model
- Authentication foundation
- Authorization model
- API conventions
- Basic observability
- Deployment baseline

## Key Decisions To Lock Before Building
1. Choose the backend stack from the spec and freeze it for MVP.
2. Choose the primary database and define migration tooling.
3. Decide whether the frontend and backend live in one repo or a monorepo.
4. Define the authentication provider and session model.
5. Define file storage strategy for asset images and QR assets.

## Step-By-Step Plan
1. Create the application skeleton.
   - Set up frontend app, backend app, shared configuration, and documentation.
   - Add a `docs/architecture` section later only if complexity grows.
   - Configure linting, formatting, type checking, and test runners.
2. Define environment variables.
   - Add local, staging, and production environment templates.
   - Include database URL, auth secrets, mail provider keys, storage keys, and app base URLs.
   - Fail fast at startup when required variables are missing.
3. Set up the database layer.
   - Configure migrations and seed support.
   - Create initial tables for users, assets, bookings, events, notifications, QR codes, and audit fields.
   - Add standard fields to every primary table: `id`, `created_at`, `updated_at`, `deleted_at` if soft delete is needed.
4. Define shared enums and domain rules.
   - User roles: `asset_owner`, `event_organizer`, `attendee`.
   - Booking statuses: `pending`, `confirmed`, `rejected`, `cancelled`, `completed`.
   - Event visibility: `public`, `private`.
   - Notification statuses: `queued`, `sent`, `failed`.
5. Establish API patterns.
   - Standardize request validation, error responses, pagination, filtering, and authentication middleware.
   - Document route naming conventions for all future modules.
   - Use versioned API paths if the stack supports it cleanly.
6. Build auth and authorization foundations.
   - Implement signup, login, logout, password reset, session validation, and current user lookup.
   - Add role-aware route protection at the API layer.
   - Add ownership checks so users can only modify records they own unless explicitly allowed.
7. Set up asynchronous job handling.
   - Create a queue or job abstraction for emails, future reminders, and QR regeneration.
   - Support retries and dead-letter logging even if the first implementation is lightweight.
8. Add observability.
   - Centralize structured logging.
   - Track request IDs and background job IDs.
   - Capture core metrics: signups, asset creations, bookings created, QR scans, emails sent.
9. Prepare deployment pipelines.
   - Configure frontend deployment and backend deployment targets.
   - Add migration execution to deployment workflow.
   - Add health checks for API, database connectivity, and queue processing.

## Suggested Initial Data Model
- `users`
- `user_profiles`
- `assets`
- `asset_availability_rules`
- `bookings`
- `booking_status_history`
- `events`
- `event_assets`
- `event_rsvps`
- `qr_codes`
- `notifications`

## Dependencies
- No other module depends on implementation details more than this one.
- User system can start as soon as auth foundations exist.

## Acceptance Criteria
- New developers can run the app locally from a clean clone.
- Migrations create all baseline tables successfully.
- Auth works end to end.
- Protected routes reject unauthorized access.
- Logs and errors are traceable across API requests and background jobs.

## Risks To Control
- Do not implement advanced microservices for MVP.
- Do not build a generic workflow engine.
- Do not overdesign permissions beyond current roles and ownership checks.
