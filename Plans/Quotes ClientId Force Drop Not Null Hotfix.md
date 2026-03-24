# Quotes ClientId Force Drop Not Null Hotfix

## Summary
- Goal: finish the live guest-quote repair by forcing the real Postgres `NOT NULL` constraint off `Quotes.clientId`.
- Scope: add a raw-SQL migration that drops the constraint directly, verify it in migration tests, and keep the already-added route fallbacks as defense in depth.
- Constraints: the previous `changeColumn(...)` hotfix was not sufficient on the live production table, so this fix must target the exact SQL constraint directly.

## Key Changes
- Add a new migration that resolves the actual `Quotes` table and executes `ALTER TABLE ... ALTER COLUMN ... DROP NOT NULL` against `clientId`.
- Keep the migration idempotent enough for current production shape by only acting when the table and column exist.
- Add regression coverage proving the raw SQL issued by the migration targets the quoted `Quotes.clientId` column.

## Test Plan
- Automated: `node --test tests/api-v2/migrations-quote-table-compat.test.js`
- Automated: `npm.cmd run test:ci`
- Manual: run `npm run migrate` on the droplet, then submit the public quote form and confirm the backend no longer logs `clientId violates not-null constraint`.

## Assumptions
- The production table name is the quoted `Quotes` relation used by the live inserts shown in the logs.
- The schema-level drop of `NOT NULL` is the final source fix; the route-level compatibility fallback should remain only as additional protection.
