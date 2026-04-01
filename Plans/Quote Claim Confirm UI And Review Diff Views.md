# Quote Claim Confirm UI And Review Diff Views

## Summary

- Scope: Add inline quote claim confirmation flows, improve revision history into visual side-by-side diffs, and add a separate manager review/timeline view.
- Goal: Let clients finish quote claiming inside the product flow and let both client and manager users inspect review changes more clearly.
- Out of scope: Reworking auth/session architecture, changing the quote claim backend contract, or replacing the current revision-history storage model.

## Key Changes

- Area 1: Quote claim confirmation UX
  - Add claim-confirm UI on `/quote` and `/auth`.
  - Support prefilled claim links from quote completion into auth.
- Area 2: Client diff viewer
  - Replace text-only revision summaries with a side-by-side previous/current comparison view.
  - Keep using the existing revision snapshots so the mobile/API contract stays portable.
- Area 3: Manager review timeline
  - Add a dedicated manager review page for quote + estimate review events and diffs.
  - Link to it from manager quote cards without overloading the main dashboard card.

## Public APIs / Interfaces

- Routes:
  - Reuse guest claim confirm endpoint from authenticated flows.
  - Reuse manager/client quote detail routes for the review pages.
- UI contracts:
  - Quote completion state carries a prefilled claim continuation link.
  - Auth page exposes a dedicated quote-claim card.
  - Client and manager review pages render the same diff building blocks.
- Data contracts:
  - Revision snapshots remain the source for side-by-side comparison.
  - Claim forms use quoteId + claimToken + claimCode as the portable handoff contract.

## Test Plan

- Generation / build:
  - `npm run verify:generated`
- Automated tests:
  - `npm run test:api:v2`
  - Focused quote claim tests
  - Focused manager/client review route tests
- Manual checks:
  - Submit a guest quote, then claim it from `/quote` and from `/auth`.
  - Open the client diff viewer and the manager review timeline for a quote with revisions.
- Acceptance criteria:
  - Guest quote claim can be completed without leaving the product flow.
  - Revision history is readable as side-by-side previous/current changes.
  - Managers have a separate review screen instead of reviewing history only inside the dashboard card.

## Assumptions

- Assumption 1: The existing revision snapshot payloads are sufficient for a first visual diff viewer.
- Assumption 2: Claim confirmation should still require an authenticated user session.
- Assumption 3: A separate manager review page is preferable to expanding the already dense manager dashboard card.
