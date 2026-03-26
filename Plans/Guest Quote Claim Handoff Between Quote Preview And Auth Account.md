# Guest Quote Claim Handoff Between Quote Preview And Auth Account

## Summary
- Goal: connect the existing guest quote preview panel to the current claim endpoints so a customer can request a claim code from the private quote link and finish the claim after login or registration.
- Scope: public quote preview UI, `auth.html` claim-confirm panel, small legacy quote preview/claim response extensions, and regression coverage.
- Constraints: keep the current legacy `ll_auth_*` session flow working today, avoid breaking brochure quote forms, and do not force `/app-v2` as the post-claim destination until auth/session ownership is unified.

## Key Changes
- Extend `GET /api/quotes/guest/:publicToken` and `POST /api/quotes/guest/:id/claim/request` with safe claim hints (`claimChannels`, masked contact target) that the brochure UI can consume without exposing raw guest contact data.
- Rework `quote.js` so the follow-up/status panel can request a claim code by email or phone, persist pending-claim context locally, and hand the customer off to `auth.html`.
- Add a dedicated quote-claim panel to `auth.html` / `auth.js` that keeps the user on the auth page after login/register when a pending quote claim exists, then confirms the 6-digit code and redirects to the currently compatible client workspace.
- Lock the flow with updated API tests and Playwright coverage for preview restoration plus quote claim request -> login -> confirm.

## Test Plan
- Automated:
  - `node --test tests/api-v2/legacy-public-routes.test.js`
  - `node scripts/run-playwright.js -c tests/playwright/playwright.config.js --grep "quote page shows a private guest quote preview after submit and from the saved quote link|guest quote claim handoff runs from the private quote panel into auth confirmation"`
  - `npm.cmd run test:ci`
- Manual:
  - submit a real guest quote from `/quote.html`
  - request a claim code from the private preview panel
  - login/register on `/auth.html` and confirm the code against the live delivery channel

## Assumptions
- The current safe post-claim destination remains `client-dashboard.html` because legacy brochure auth still owns the active session and `/app-v2` uses a separate token model.
- Masked contact hints are acceptable on the private quote link because the link already acts as the guest-access secret.
- The broader guest quote portal parity task stays open; this round only closes the claim handoff gap, not later guest responses or follow-up media uploads after submission.
