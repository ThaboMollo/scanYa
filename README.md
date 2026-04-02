# scanYa

Booking-first event and asset platform scaffold for QR-led discovery and booking.

## Stack
- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- Shared contracts: TypeScript package
- Database target: PostgreSQL schema included in [`db/schema.sql`](/Users/thabomollomponya/Dev/scanYa/db/schema.sql#L1)

## Workspace Layout
- [`apps/web`](/Users/thabomollomponya/Dev/scanYa/apps/web)
- [`apps/api`](/Users/thabomollomponya/Dev/scanYa/apps/api)
- [`packages/shared`](/Users/thabomollomponya/Dev/scanYa/packages/shared)
- [`docs`](/Users/thabomollomponya/Dev/scanYa/docs)

## MVP Implemented In This Scaffold
- User registration and login API
- Asset owner asset creation and listing
- Availability lookup by asset and date
- Booking request flow with conflict checks
- Owner booking approval and rejection actions
- QR code token generation and resolution API
- Demo React frontend covering the core flows

## Local Setup
1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and adjust values if needed.
3. Start the API with `npm run dev:api`.
4. Start the web app with `npm run dev:web`.

## Demo Accounts
- `owner@scanya.app` / `password123`
- `attendee@scanya.app` / `password123`
- `organizer@scanya.app` / `password123`

## Current Constraints
- The API now expects a MongoDB cluster via `MONGODB_URI` and `MONGODB_DB_NAME`.
- Notifications are represented as API messages and placeholders, not a real mail worker yet.
- Event creation and discovery docs exist, but implementation is not built yet.
- Authentication uses a simple bearer token session for the scaffold and should be upgraded before production.
