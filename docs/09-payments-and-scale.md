# Payments and Scale Plan

## Goal
Prepare the platform for monetization and higher operational load after the booking and discovery foundations prove demand.

## Scope
- Commission model
- Subscription model
- Payment capture
- Operational scaling
- Reliability hardening

## User Stories
- As the platform, I can charge for bookings or subscriptions.
- As an asset owner or organizer, I understand fees before committing.
- As the system, I remain stable as bookings, scans, and notifications increase.

## Step-By-Step Plan
1. Define monetization rules.
   - Decide whether commissions apply to bookings, events, or both.
   - Define when a charge occurs: request time, confirmation time, or completion time.
   - Define refund and dispute basics before coding money flows.
2. Add payment domain model.
   - Payments, payouts, invoices, and fee records if needed.
   - Keep payment records auditable and immutable where appropriate.
3. Choose payment provider.
   - Evaluate support for marketplace payouts if owners will be paid through the platform.
   - Validate support for the target countries and currencies.
4. Implement booking payment flow.
   - Add payment intent or checkout session creation.
   - Attach payment state to bookings without making payment the source of truth for booking status.
   - Handle webhook updates securely.
5. Implement subscription flow.
   - Define plan tiers for owners or organizers.
   - Restrict premium capabilities behind subscription checks only after base product value is proven.
6. Add finance-facing notification and reporting.
   - Payment receipts
   - Failed payment alerts
   - Basic revenue reporting
7. Scale the platform operationally.
   - Add database indexes based on real usage patterns.
   - Add caching for hot public pages and availability reads where safe.
   - Harden background jobs and retry behavior.
   - Add rate limiting on auth, booking, and QR endpoints.
8. Add resilience and support tooling.
   - Operational dashboards
   - Alerting
   - Replayable jobs
   - Safer admin support actions
9. Test payment and scale scenarios.
   - Webhook verification
   - Double-submit protection
   - High QR scan volume
   - Booking traffic spikes

## Dependencies
- Should start only after booking engine and event system have clear product-market usage.

## Acceptance Criteria
- Money flows are auditable and secure.
- Payment failures do not corrupt booking state.
- The platform can handle higher read and write volume without major redesign.

## Implementation Notes For Agents
- Do not start with this module unless explicitly prioritized.
- Payments increase compliance and support requirements significantly.
- Scale work should be driven by measured bottlenecks, not assumed future load.
