# Event Discovery Hub Plan

## Goal
Create the public-facing discovery layer for browsing and engaging with events after the booking core is stable.

## Scope
- Public event listing
- Search and filtering
- Event cards and detail discovery
- RSVP entry from discovery
- Basic social proof

## User Stories
- As a user, I can browse upcoming public events.
- As a user, I can filter events by location, date, or category if categories are added.
- As an organizer, I benefit from discoverability and RSVP growth.

## Step-By-Step Plan
1. Define discovery requirements.
   - Only published public events should appear.
   - Decide the initial sort order: newest, upcoming soonest, or featured.
   - Decide what minimal metadata is needed on cards.
2. Build public listing endpoint.
   - Add filtering by date range and location if location data is standardized.
   - Add pagination.
   - Exclude private, cancelled, and expired events by default.
3. Build discovery landing page.
   - Show event cards with image, title, date, location, and RSVP or view-details action.
   - Handle empty results and loading states.
4. Add search and filtering UI.
   - Date filters
   - Location filter
   - Optional category filter only if category data exists
5. Improve event detail pages for discovery traffic.
   - Ensure event details are readable and conversion-oriented.
   - Show RSVP CTA clearly.
6. Add basic engagement analytics.
   - Track impressions, detail views, RSVP starts, and completed RSVPs.
   - Attribute whether discovery traffic came from listing, direct link, or QR.
7. Add simple social proof.
   - RSVP count
   - "Upcoming" or "Almost full" indicators only if data is reliable
8. Test public discovery flows.
   - List page loads with only valid events
   - Filters behave correctly
   - RSVP from discovery path succeeds

## API Surface To Implement
- `GET /events/public`
- `GET /events/public/:id`

## Dependencies
- Depends on event system and analytics groundwork.

## Acceptance Criteria
- Users can browse upcoming public events without authentication where intended.
- Filters return relevant results.
- Discovery pages drive users into event detail and RSVP flows.

## Implementation Notes For Agents
- Keep this module lightweight until enough public events exist to justify ranking complexity.
- Do not build a full social network.
- Avoid expensive search infrastructure until simple indexed filtering stops being sufficient.
