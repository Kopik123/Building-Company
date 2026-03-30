# Public Guest Quote V2 Shared Workflow Wave 37
## Summary
- Goal: remove the remaining legacy-route dependency from `/api/v2/public/quotes` so guest quote submit, preview, follow-up uploads and claim all run through one shared workflow.
- Scope: extract the guest quote portal logic into a reusable shared module, rewire both the legacy `/api/quotes/guest*` router and the v2 public router to that module, and refresh the affected contract/browser regressions.
- Constraints: preserve the current guest quote payloads, claim semantics, attachment handling and browser UX while keeping the legacy `/guest` URLs online as compatibility routes.
## Key Changes
- Added a shared `utils/publicGuestQuoteRoutes.js` module that owns guest quote submit, preview, follow-up attachments and claim request/confirm logic.
- Replaced the legacy router body in `routes/quotes.js` with a thin compatibility wrapper and reworked `api/v2/routes/public-quotes.js` to call the shared workflow directly instead of delegating to `routes/quotes.js`.
- Updated v2 contract tests so they prove `/api/v2/public/quotes` works without preloading the legacy router, and refreshed the Playwright guest-quote preview/claim/follow-up checks after fixing the budget selector fixture values.
## Test Plan
- Automated: `node --check utils/publicGuestQuoteRoutes.js`, `node --check routes/quotes.js`, `node --check api/v2/routes/public-quotes.js`, `node --test tests/api-v2/public-quotes-v2-contract.test.js`, `node --test tests/api-v2/legacy-public-routes.test.js`, and focused Playwright guest-quote preview/claim/follow-up flows.
- Manual: after deploy, verify `/quote.html` guest submit still returns a private preview link, follow-up photos append correctly, and claim handoff on `auth.html` still confirms against the same saved quote.
## Assumptions
- Keeping one shared workflow module plus two thin router wrappers is a sufficient parity step; a deeper service-layer/domain extraction can wait until the remaining quote lifecycle consolidation work starts.
