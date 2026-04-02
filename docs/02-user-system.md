# User System Plan

## Goal
Support registration, authentication, profile management, and role-aware access for asset owners, event organizers, and attendees.

## Scope
- Account creation and login
- User profile
- Role assignment
- Basic account settings
- Session management

## User Stories
- As a new user, I can register and choose how I plan to use the platform.
- As an existing user, I can log in securely and access my dashboard.
- As a user, I can edit my profile and contact details.
- As the system, I can determine what actions a user is allowed to take.

## Step-By-Step Plan
1. Define user entities.
   - Create a base `users` table for credentials and auth state.
   - Create a `user_profiles` table for display name, phone, company, and optional profile metadata.
   - Store the primary role on the user record; allow future support for multi-role expansion if needed.
2. Implement signup flow.
   - Build frontend forms for registration.
   - Collect minimum required fields only: name, email, password, role.
   - Validate password strength and duplicate email prevention.
   - Create the profile record immediately after user creation.
3. Implement login and session flow.
   - Add login form, logout action, forgot password, and reset password flow.
   - Ensure protected pages redirect correctly.
   - Add token or session expiry handling.
4. Build current-user retrieval.
   - Add endpoint for current authenticated user and profile.
   - Hydrate frontend session state from this endpoint on app load.
5. Build profile management.
   - Create profile page for editing name, phone, company, and avatar or image later if needed.
   - Validate email changes through a verification flow if supported by the auth provider.
6. Implement role-aware dashboards.
   - Asset owners see assets and bookings.
   - Event organizers see events and RSVPs.
   - Attendees see booked assets and RSVP history where relevant.
   - Keep the first version simple with conditional navigation and landing cards.
7. Add authorization guards.
   - Restrict asset creation to asset owners.
   - Restrict event creation to event organizers.
   - Allow attendees to browse and make bookings or RSVPs where permitted.
8. Add audit-friendly account events.
   - Record signup time, last login, email verification status, and account status.
   - Expose enough data for admin review later without building a full admin console now.
9. Test critical flows.
   - Registration
   - Login/logout
   - Password reset
   - Unauthorized route access
   - Role-based action denial

## API Surface To Implement
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /me`
- `PATCH /me`

## Dependencies
- Requires foundation, auth setup, and database migrations.
- Asset, booking, and event modules depend on this module.

## Acceptance Criteria
- Users can register, log in, log out, and recover their account.
- Role-based navigation and route protection work consistently.
- Profile edits persist correctly.
- Unauthorized users cannot perform owner or organizer actions.

## Implementation Notes For Agents
- Keep role logic centralized in shared auth or policy helpers.
- Do not scatter permission checks across random UI components only.
- Build for progressive enhancement: one account model, role-specific capabilities.
