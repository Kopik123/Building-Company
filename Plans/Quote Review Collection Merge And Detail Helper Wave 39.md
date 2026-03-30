# Quote Review Collection Merge And Detail Helper Wave 39

## Summary
- Goal: deduplicate merged quote review list/detail assembly between legacy manager review and the client-facing `/api/v2/quotes` merge path.
- Scope: shared merge/pagination/detail-fallback helpers plus manager/v2 route rewiring and regressions.
- Constraints: keep quote payload shapes, attachment previews and manager/client behavior unchanged.

## Key Changes
- Added `utils/quoteReviewCollection.js` for merged review sorting, pagination and legacy->staged detail fallback.
- Rewired the client merged list in `api/v2/routes/quotes.js` and the manager merged list/detail path in `routes/manager/quote-routes.js` to use the shared collection helper.
- Reused one `legacyQuoteInclude` array in the manager quote route and added `tests/api-v2/quote-review-collection.test.js`.

## Test Plan
- Automated: `node --check utils/quoteReviewCollection.js`, `api/v2/routes/quotes.js`, `routes/manager/quote-routes.js`, `tests/api-v2/quote-review-collection.test.js`; plus `node --test tests/api-v2/quote-review-collection.test.js`, `tests/api-v2/manager-quotes-include-attachments.test.js`, `tests/api-v2/manager-staged-new-quotes-review.test.js` and `tests/api-v2/quotes-rbac-crud.test.js`.
- Manual: verify manager quote list/detail and client quote history still show the same merged records after deploy.

## Assumptions
- Future Android/iOS clients benefit from one shared quote review collection policy instead of route-local merge/sort/detail-fallback logic.
