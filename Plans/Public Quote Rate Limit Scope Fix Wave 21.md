# Public Quote Rate Limit Scope Fix Wave 21

## Summary
- Goal: stop public quote submit and follow-up requests from being blocked by the shared global API rate limiter.
- Scope: narrow the global `/api/*` limiter so public guest quote paths use their own dedicated limiter, then lock the behavior with app-level regression coverage.
- Constraints: keep auth/contact/claim protection intact and avoid changing the public quote API contract.

## Key Changes
- Added `isPublicQuoteApiPath` in `app.js` and configured the global `/api/*` limiter to skip public guest quote endpoints.
- Added a dedicated public quote limiter for `/api/quotes/guest` and `/api/v2/public/quotes`, while keeping the stricter claim limiter on claim routes.
- Added an app-level regression test that verifies the global limiter skips public quote paths and that quote/auth/contact limiters keep their intended windows.

## Test Plan
- Automated: `node --check app.js`, `node --check tests/api-v2/app-legacy-routes.test.js`.
- Automated: `node --test tests/api-v2/app-legacy-routes.test.js`.
- Automated: focused Playwright for public quote submit and photo-retry flows.

## Assumptions
- The current `express-rate-limit` in-memory limiter resets on deploy/restart and remains acceptable for this single-node deployment.
- Public quote submit legitimately performs multiple API requests in one customer flow, so it should not inherit the same limiter budget as the whole API surface.
