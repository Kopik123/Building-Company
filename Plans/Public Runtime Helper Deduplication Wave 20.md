# Public Runtime Helper Deduplication Wave 20

## Summary
- Goal: remove duplicated public-shell helper logic from `auth.js` and `quote.js` without changing guest quote, claim or session behavior.
- Scope: centralise pending quote-claim storage helpers, token formatting helpers and timestamp formatting in `runtime.js`, then rewire both entry scripts to consume the shared runtime helpers.
- Constraints: keep the current public quote + auth contracts unchanged and validate with focused browser regressions rather than broad product changes.

## Key Changes
- Added shared quote-claim helper ownership to `runtime.js` (`QUOTE_CLAIM_STORAGE_KEY`, read/save/clear helpers, active-claim check, `humanizeToken`, `humanChannel`, `formatTimestamp`).
- Removed duplicated claim/session helper implementations from `auth.js` and rewired the account/claim flow to consume the shared runtime methods.
- Removed duplicated claim/status/formatting helpers from `quote.js` so the public quote flow and auth handoff now read one runtime implementation.

## Test Plan
- Automated: `node --check runtime.js`, `node --check auth.js`, `node --check quote.js`.
- Automated: focused Playwright for public quote preview, photo-retry fallback, claim handoff and auth session refresh.
- Manual: none for this wave because behavior is already covered by the targeted browser regressions.

## Assumptions
- `runtime.js` remains the guaranteed shared browser bootstrap for `auth.html` and `quote.html`.
- This wave is a cleanup/refactor pass, not a product-change pass.
