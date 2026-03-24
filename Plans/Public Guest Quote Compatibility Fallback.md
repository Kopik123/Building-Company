# Public Guest Quote Compatibility Fallback

## Summary
- Goal: keep public quote intake working even if the live database still rejects the newer quote lifecycle columns during `Quote.create(...)`.
- Scope: add a compatibility fallback in the legacy guest quote route, keep lifecycle metadata best-effort after fallback, and lock the behavior in automated tests.
- Constraints: customer quote capture must remain available immediately on production, even if lifecycle metadata has to be backfilled after the initial insert.

## Key Changes
- Try the full guest quote create with lifecycle fields first, but retry with a legacy-safe payload when the first insert fails.
- After the compatibility insert succeeds, try to backfill `workflowStatus`, `sourceChannel` and `submittedAt` as a non-blocking follow-up update.
- Add regression coverage proving the route returns `201` even when the first full create fails on lifecycle columns.

## Test Plan
- Automated: `node --test tests/api-v2/legacy-public-routes.test.js`
- Automated: `npm.cmd run test:ci`
- Manual: submit the public quote form on live production and confirm the page returns a quote reference instead of `Internal server error`.

## Assumptions
- The remaining live failure happens in the blocking `Quote.create(...)` path rather than in the already-hardened side effects.
- A compatible customer intake path is more important right now than forcing every live quote to carry the newest lifecycle fields at insert time.
