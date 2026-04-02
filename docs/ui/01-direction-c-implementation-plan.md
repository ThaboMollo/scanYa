# Direction C UI Implementation Plan

## Objective
Refactor the current frontend into two connected experiences:

- Public marketplace
- Logged-in workspace

The current interface is useful as a demo but not strong enough as a product surface. The next implementation phase should improve structure first, then visual hierarchy, then booking and management flows.

## Product Model

### Public Marketplace
Purpose:
- Explain the product clearly
- Help users discover assets and events
- Convert traffic into booking requests or RSVPs

Core surfaces:
- Homepage
- Asset listing
- Asset detail and booking flow
- Event listing
- Event detail
- QR landing path

### Logged-In Workspace
Purpose:
- Help asset owners and organizers manage operational tasks
- Surface what needs action
- Keep management views efficient and structured

Core surfaces:
- Dashboard
- Assets
- Bookings
- QR management
- Events
- Profile

## Current UI Problems To Fix
- Public discovery and owner operations are mixed together in one screen.
- Layout sections are based on backend modules instead of user intent.
- Booking detail is presented as raw timestamps rather than a strong scheduler experience.
- The visual system feels like a scaffold, not a product.
- Owners do not have a real workspace shell for inventory and booking management.

## Implementation Phases

## Phase 1: Route Split And Layout Shells

### Goal
Separate the app into public and workspace route groups.

### Deliverables
- Public route group
- Workspace route group
- Public layout shell
- Workspace layout shell
- Role-aware entry logic

### Tasks
1. Add client-side routing to the frontend app.
2. Replace the single-page `App.tsx` architecture with route-based pages.
3. Create a public layout shell.
   - Top navigation
   - Primary CTA buttons
   - Footer
4. Create a workspace layout shell.
   - Sidebar navigation
   - Utility header
   - Content container for operational pages
5. Define route groups.
   - Public:
     - `/`
     - `/assets`
     - `/assets/:id`
     - `/events`
     - `/events/:id`
     - `/q/:token`
   - Workspace:
     - `/app`
     - `/app/assets`
     - `/app/bookings`
     - `/app/qr`
     - `/app/events`
     - `/app/profile`
6. Add role-aware entry logic.
   - Public users default to marketplace pages
   - Asset owners default to `/app`
   - Event organizers should later default to `/app/events`

### Acceptance Criteria
- Public and workspace views are no longer mixed together.
- Navigation reflects the user's intent rather than the system's internal modules.
- The app has a scalable page architecture for future event and discovery work.

## Phase 2: Design Tokens And Reusable Primitives

### Goal
Create a frontend design foundation that supports a richer public experience and a cleaner operational workspace.

### Deliverables
- Shared design tokens
- Reusable UI primitives
- Responsive layout rules

### Tasks
1. Define global CSS variables for:
   - color system
   - typography scale
   - spacing scale
   - radius
   - shadow levels
   - motion timing
2. Lock the visual direction:
   - warm neutral background
   - charcoal primary text
   - one bold brand accent
   - one utility accent for statuses
3. Create a reusable component layer:
   - button
   - badge
   - card
   - section header
   - stat tile
   - empty state
   - form field wrapper
   - sidebar nav item
4. Build two visual panel systems:
   - public-facing product cards
   - workspace-facing utility panels
5. Add responsive rules for:
   - mobile booking flows
   - tablet layouts
   - desktop dashboard density

### Acceptance Criteria
- The UI has one coherent design language.
- Public and workspace surfaces feel related but distinct.
- The interface no longer depends on one-off styling at page level.

## Phase 3: Homepage Redesign

### Goal
Turn the homepage into a conversion-oriented entry point for both customers and inventory owners.

### Deliverables
- Hero section
- Featured assets preview
- Upcoming events preview
- QR explanation section
- Trust strip
- Footer navigation

### Tasks
1. Build a hero section with:
   - strong headline
   - concise product value proposition
   - primary CTA for asset browsing
   - secondary CTA for listing inventory
2. Add a featured assets section.
3. Add an upcoming events preview section.
4. Add a three-step “How QR booking works” section.
5. Add trust messaging:
   - visible availability
   - fast booking workflow
   - QR-enabled access
6. Add a footer with marketplace and workspace links.

### Acceptance Criteria
- The homepage explains the product immediately.
- Users can choose between booking and listing without confusion.
- The page feels like a real marketplace landing page.

## Phase 4: Asset Browse And Asset Detail Redesign

### Goal
Make the asset detail page the strongest page in the product and improve discovery-to-booking conversion.

### Deliverables
- Asset browse page
- Asset detail page
- Booking side panel
- Human-readable availability UI

### Tasks
1. Build `/assets` as a dedicated browse experience.
   - card grid or structured list
   - category summary
   - location summary
   - pricing label
2. Build `/assets/:id` as a premium detail page.
   - visual hero area
   - asset summary
   - quick facts
   - description
   - trust block
   - booking entry point
3. Move the booking request flow into a dedicated panel.
   - sticky side panel on desktop
   - anchored booking section on mobile
4. Convert raw timestamps into readable booking windows.
5. Improve booking states:
   - unauthenticated
   - invalid slot
   - pending request submitted
   - conflict returned

### Acceptance Criteria
- The asset detail page supports confident booking.
- Availability is understandable without parsing raw ISO dates.
- The booking CTA remains prominent throughout the page.

## Phase 5: Workspace Shell And Owner Dashboard

### Goal
Create a real operational home for asset owners.

### Deliverables
- Workspace app shell
- Owner dashboard overview
- Action-first navigation

### Tasks
1. Build the workspace sidebar with links for:
   - dashboard
   - assets
   - bookings
   - QR
   - profile
2. Build the workspace top bar with:
   - current role
   - quick actions
   - account menu
3. Build dashboard summary cards:
   - active assets
   - pending bookings
   - upcoming confirmed bookings
   - QR scan counts
4. Add a recent activity module.
5. Add first-run empty states for new owners.

### Acceptance Criteria
- Asset owners land in a workspace, not in a generic public page.
- Dashboard information supports quick operational decisions.

## Phase 6: Owner Asset Management Redesign

### Goal
Improve inventory management for owners using focused, repeatable forms and list views.

### Deliverables
- Assets index page
- Asset creation page
- Asset edit page
- Filtering and status controls

### Tasks
1. Build `/app/assets` as an inventory management surface.
2. Add filters for:
   - published
   - draft
   - archived
3. Create dedicated create and edit pages.
4. Structure the asset form into sections:
   - basic information
   - pricing
   - availability
   - publishing state
5. Add validation and preview-friendly feedback.

### Acceptance Criteria
- Owners can manage multiple assets without relying on a small inline form.
- The asset form feels like a proper product workflow.

## Phase 7: Booking Management Redesign

### Goal
Make booking review and booking status easier to understand and act on.

### Deliverables
- Booking list page
- Booking detail panel or drawer
- Owner approval controls
- Customer-facing status cleanup

### Tasks
1. Build `/app/bookings` as a dedicated booking management surface.
2. Group or filter bookings by:
   - pending
   - confirmed
   - rejected
   - cancelled
3. Add a detail view for selected bookings.
4. Improve confirm and reject actions.
5. Improve the attendee booking history display.
6. Add a booking status timeline or progress indicator.

### Acceptance Criteria
- Owners can process incoming requests quickly.
- Customers can understand booking state without ambiguity.

## Phase 8: QR And Event-Ready Surfaces

### Goal
Make QR feel like an integrated product capability and prepare the new UI system for event features.

### Deliverables
- QR management page
- QR-aware landing states
- Event page templates matching the new design system

### Tasks
1. Build `/app/qr` for QR management.
2. Show QR metadata:
   - destination
   - scan count
   - status
   - create or download action
3. Style QR landing states to match the public marketplace.
4. Create event listing and event detail templates that fit the new public layout even if feature logic is added later.

### Acceptance Criteria
- QR management fits naturally into the owner workspace.
- Event pages can be added later without another full redesign.

## Recommended Build Sequence
1. Route split and layout shells
2. Design tokens and primitives
3. Homepage redesign
4. Asset browse and asset detail redesign
5. Workspace shell and dashboard
6. Owner asset management redesign
7. Booking management redesign
8. QR and event-ready surfaces

## Proposed Frontend File Structure
- `src/layouts/PublicLayout.tsx`
- `src/layouts/WorkspaceLayout.tsx`
- `src/pages/HomePage.tsx`
- `src/pages/AssetsPage.tsx`
- `src/pages/AssetDetailPage.tsx`
- `src/pages/EventsPage.tsx`
- `src/pages/EventDetailPage.tsx`
- `src/pages/WorkspaceDashboardPage.tsx`
- `src/pages/WorkspaceAssetsPage.tsx`
- `src/pages/WorkspaceBookingsPage.tsx`
- `src/pages/WorkspaceQrPage.tsx`
- `src/pages/ProfilePage.tsx`
- `src/components/ui`
- `src/components/public`
- `src/components/workspace`

## Constraints And Rules
- Mobile-first for public booking pages
- Desktop-efficient density for workspace pages
- No raw ISO timestamps in user-facing UI
- Public pages should feel richer and more editorial than workspace pages
- Keep role logic centralized instead of scattering conditional logic across pages
- Preserve existing API integration while refactoring the UI

## Definition Of Done
- Public marketplace and workspace are structurally separated
- Homepage clearly communicates the product
- Asset detail page supports confident booking
- Owner workspace supports real operations
- Responsive behavior works on mobile and desktop
- The refactored UI still works with the current frontend API layer
