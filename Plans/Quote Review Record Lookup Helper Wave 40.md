# Quote Review Record Lookup Helper Wave 40

## Summary
- Goal: deduplicate legacy-vs-staged quote record lookup and access checks inside `/api/v2/quotes`.
- Scope: shared lookup helper, `api/v2/routes/quotes.js` rewiring, and targeted regressions.
- Constraints: keep existing quote payloads and staff/client behavior unchanged for detail, attachment append, timeline and estimate access.

## Key Changes
- Added `utils/quoteReviewLookup.js` as a shared access-aware resolver for legacy quotes and staged `new_quotes`.
- Rewired `api/v2/routes/quotes.js` detail, attachment append, patch, timeline and estimate-list paths to use the shared lookup helper instead of route-local branching.
- Added `tests/api-v2/quote-review-lookup.test.js` and re-ran targeted quote review regressions.

## Test Plan
- Automated: `node --check utils/quoteReviewLookup.js`, `api/v2/routes/quotes.js`, `tests/api-v2/quote-review-lookup.test.js`; plus `node --test tests/api-v2/quote-review-lookup.test.js`, `tests/api-v2/quotes-rbac-crud.test.js`, `tests/api-v2/manager-quotes-include-attachments.test.js` and `tests/api-v2/manager-staged-new-quotes-review.test.js`.
- Manual: verify client quote detail, follow-up photo upload, timeline and estimate views still behave the same for legacy quotes while staged records still return the expected empty timeline/estimate states.

## Assumptions
- Future mobile clients benefit from one shared quote record lookup policy instead of repeating legacy-vs-staged branching in each quote endpoint.
