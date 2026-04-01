# Quote Submission, Claim Code UX And Dedicated Client Review Follow-up

## Summary

- Scope: Improve the quote intake flow for guest and signed-in users, stop sending guest claim codes by email/SMS, add a dedicated client review screen, generate estimate PDFs automatically, and make revision notifications/diffs more useful.
- Goal: Make quote submission and client review feel complete end-to-end on web while keeping the API/contracts portable for future mobile clients.
- Out of scope: Replacing the existing auth/account model, building a full audit-log database, and introducing a third-party PDF dependency in this pass.

## Key Changes

- Area 1: Quote submission and claim code UX
  - Support a dedicated signed-in quote creation route.
  - Show the guest claim code immediately after quote completion with a clear save/expiry warning.
- Area 2: Client review surface
  - Move the richer quote/estimate review actions into a separate client review page.
  - Keep the dashboard card as a summary/entry point instead of the full review surface.
- Area 3: Review artifacts and notifications
  - Auto-generate an estimate PDF from estimate lines when needed.
  - Expose revision diffs and add more specific manager/client notifications for review-related updates.

## Public APIs / Interfaces

- Routes:
  - Add an authenticated quote submission endpoint.
  - Extend client quote review reads with dedicated review payloads and diff data.
  - Add estimate PDF generation endpoint/flow.
- UI contracts:
  - Public quote page shows distinct guest vs signed-in completion states.
  - Client dashboard links into a dedicated review screen.
- Data contracts:
  - Quote claim responses expose the code directly instead of only returning delivery metadata.
  - Review/revision responses include enough context to render diffs and targeted notifications.

## Test Plan

- Generation / build:
  - `npm run verify:generated`
- Automated tests:
  - `npm run test:api:v2`
  - Focused quote-route tests for guest/authenticated submission and claim-code responses
- Manual checks:
  - Submit a quote as a guest and confirm the code is shown with save guidance.
  - Submit a quote while signed in and confirm it lands directly in the account-linked quote flow.
  - Open the dedicated client review screen and verify PDF/download, decisions, and revision diffs.
- Acceptance criteria:
  - Guest quote intake no longer depends on email/SMS delivery to recover the claim code.
  - Logged-in clients can submit without falling back to the guest claim flow.
  - Client review actions work from the dedicated screen and keep notification/revision trails coherent.

## Assumptions

- Assumption 1: A lightweight server-generated PDF is acceptable for this phase if it avoids adding a new dependency immediately.
- Assumption 2: Returning the guest claim code once at submission/request time is acceptable as long as the UI clearly warns the user to save it.
- Assumption 3: A dedicated web review page is the right next step before adding a native/mobile-specific review surface later.
