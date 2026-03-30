# Quotes ClientId Nullability Production Hotfix

## Summary
- Goal: fix live guest quote intake by making `Quotes.clientId` nullable on production databases that still carry the older `NOT NULL` constraint.
- Scope: add a targeted migration hotfix, verify it only changes the column when needed, and preserve the existing guest quote route behavior after deployment.
- Constraints: production is already running and the fix must be safe to apply on databases that are already correct.

## Key Changes
- Add a new resumable migration that finds the existing `Quotes` table, inspects `clientId`, and runs `changeColumn(... allowNull: true ...)` only when the column is still non-nullable.
- Keep the route-level guest quote compatibility fallback in place as a safety net, but move the real production fix to the schema layer.
- Add migration regression coverage for both the “column still NOT NULL” case and the “already nullable” no-op case.

## Test Plan
- Automated: `node --test tests/api-v2/migrations-quote-table-compat.test.js`
- Automated: `npm.cmd run test:ci`
- Manual: run `npm run migrate` on the droplet, then re-submit the public quote form and confirm the request returns a quote reference.

## Assumptions
- The production `Quotes` table predates the repo baseline and still has a legacy `clientId NOT NULL` constraint.
- Future guest quote submissions should not depend on manufacturing placeholder users just to satisfy an outdated schema rule.
