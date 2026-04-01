# Migration Hotspot Hardening For ReDoS And Dynamic SQL

## Summary

- Scope: harden the remaining migration-layer security hotspots called out in the latest review.
- Goal: remove regex patterns with backtracking risk from migration error handling and make the dynamic trigram-index SQL path safe against identifier injection.
- Out of scope: wider migration refactors, dependency upgrades, or unrelated Sequelize cleanup.

## Key Changes

- Area 1: Missing-table detection
  - Replace the remaining regex-based migration error checks with bounded string parsing helpers.
  - Keep support for the current Postgres/SQLite missing-table error message variants.
- Area 2: Dynamic SQL safety
  - Validate migration identifier inputs before they can be interpolated into raw SQL.
  - Use local quoting for validated SQL identifiers in the trigram-index helper.
- Area 3: Regression coverage
  - Extend migration compatibility tests with cases for `unknown table` and `no such table` error messages.
  - Re-run the generated-page and API validation paths after the migration changes.

## Public APIs / Interfaces

- Routes:
  - No API or browser route changes.
- Data contracts:
  - No schema contract changes beyond keeping the existing migrations safe to execute.
- Operational behavior:
  - Existing migrations still tolerate expected missing-table errors and still create the same indexes/tables.

## Test Plan

- `npm ci`
- `npm run verify:generated`
- `npm run test:api:v2`
- `node --test /home/runner/work/Building-Company/Building-Company/tests/api-v2/migrations-quote-table-compat.test.js`
- `node --check /home/runner/work/Building-Company/Building-Company/migrations/202603080001-production-baseline-hardening.js`
- `node --check /home/runner/work/Building-Company/Building-Company/migrations/202603080002-v2-session-device-and-email-hardening.js`

## Assumptions

- Migration identifiers remain simple SQL identifiers rather than schema-qualified or aliased values.
- The current deployment targets continue to emit the same broad families of missing-table messages already handled by the migrations.
