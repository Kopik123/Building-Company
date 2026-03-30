# Quote Review Shared Data Helpers Wave 38

## Summary
- Goal: remove duplicated staged-quote review helpers across manager legacy review, `/api/v2/quotes` and `/api/v2/new-quotes`.
- Scope: shared include/access/filter/attachment-summary helper extraction plus targeted regressions.
- Constraints: keep existing response shapes and manager/client quote review behavior unchanged.

## Key Changes
- Added `utils/quoteReviewData.js` as the shared helper layer for staged quote include config, access rules, filter matching and legacy attachment summary shaping.
- Rewired `api/v2/routes/quotes.js`, `routes/manager/quote-routes.js` and `api/v2/routes/new-quotes.js` to reuse the shared helper instead of maintaining local copies.
- Added `tests/api-v2/quote-review-data.test.js` and re-ran staged quote regression suites.

## Test Plan
- Automated: `node --check` for the shared helper and touched routes, plus `node --test tests/api-v2/quote-review-data.test.js`, `tests/api-v2/new-quotes-staging.test.js`, `tests/api-v2/manager-staged-new-quotes-review.test.js` and `tests/api-v2/quotes-rbac-crud.test.js`.
- Manual: manager quote review and client quote/account flows continue using the same payload shapes after deploy.

## Assumptions
- Future Android/iOS clients benefit from one shared quote review/filter/access contract instead of multiple route-local copies.
