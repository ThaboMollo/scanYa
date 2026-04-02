# Event Asset Platform Implementation Docs

This folder translates the product spec into implementation-ready plans that an agent can execute.

## Recommended Build Order
1. Foundation and architecture
2. User system
3. Asset management
4. Booking engine
5. QR system
6. Notifications
7. Event system
8. Event discovery hub
9. Payments and scale

## Assumptions From The Spec
- The product should prioritize asset bookings before broader event marketplace features.
- The first usable release is the MVP defined in the spec: registration, asset listing, booking calendar, email notifications, and QR booking access.
- One codebase should support three roles: asset owner, event organizer, and attendee.
- Public event discovery is not part of the first release and should be added only after booking flows are stable.
- Payments are intentionally deferred until later phases.

## Document Map
- `01-foundation-and-architecture.md`
- `02-user-system.md`
- `03-asset-management.md`
- `04-booking-engine.md`
- `05-qr-system.md`
- `06-notification-system.md`
- `07-event-system.md`
- `08-event-discovery-hub.md`
- `09-payments-and-scale.md`
- `ui/README.md`
- `ui/01-direction-c-implementation-plan.md`

## Definition Of Done For Each Module
- Database schema is defined and migrated
- Backend endpoints are implemented and documented
- Frontend flows are connected to real data
- Authorization rules are enforced
- Error and empty states are handled
- Basic analytics events are emitted where relevant
- Tests cover happy path and critical edge cases

## Cross-Cutting Rules
- Keep role-based permissions explicit from the start.
- Model booking availability as a first-class concern, not as a UI-only calendar concept.
- Treat QR codes as entry points into validated booking or event pages, never as a trust boundary.
- Build email notifications as asynchronous jobs so they can be retried safely.
- Defer non-essential social features until discovery has measurable usage.
- Separate public marketplace UX from workspace UX instead of mixing both into one screen.
