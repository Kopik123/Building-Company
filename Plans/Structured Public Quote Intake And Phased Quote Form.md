# Structured Public Quote Intake And Phased Quote Form

## Summary
- Goal: replace the old single-step public quote form with a richer `client_proposal_quote` intake that captures structured project context without breaking the current guest quote, claim and follow-up flows.
- Scope: `quote.html`, generated brochure quote forms, public quote browser logic, legacy + v2 quote intake contracts, shared schemas, persistence, and regression coverage.
- Constraints: keep current public quote routes working during rollout, preserve future mobile-app portability, and keep the existing `description` field usable for legacy manager flows and notifications.

## Key Changes
- Persist rich intake data in a first-class `Quotes.proposalDetails` JSON field instead of flattening everything into `description` only.
- Keep `description` as a generated compatibility summary built from the structured intake so legacy manager views, notifications and search surfaces continue to work.
- Replace the single-step public quote UI with a three-step flow: `Basics`, `Scope`, `Brief`.
- Add mobile-safe client validation for each step before progression and before final submit.
- Extend public and v2 quote contracts plus shared Zod schemas so the richer intake shape is portable to `web-v2` now and future native clients later.
- Update generated brochure quote forms to use the same phased markup and payload shape as `quote.html`.
- Lock the rollout in with API, migration and Playwright coverage, including a stabilisation pass for a mobile WebKit manager rollout test that was exposed during full-suite validation.
- Better technology callout: a full generated `TypeScript + Zod` or `OpenAPI` package would be the stronger long-term source of truth, but the current shared-contract approach is still the right choice now because the quote lifecycle and intake payload are still moving quickly.

## Test Plan
- Automated:
  - `npm.cmd run generate:public-pages:content`
  - `npm.cmd run verify:generated`
  - `node --test tests/api-v2/migrations-quote-table-compat.test.js`
  - `node --test tests/api-v2/legacy-public-routes.test.js`
  - `node --test tests/api-v2/public-quotes-v2-contract.test.js`
  - `node scripts/run-playwright.js -c tests/playwright/playwright.config.js --project=desktop-chromium --grep "core brochure pages render|quote page shows a private guest quote preview"`
  - `npm.cmd run test:ci`
  - `npm.cmd run test:e2e:mobile`
- Manual:
  - Verify the phased quote form feels clear on phone widths and that step transitions do not hide required fields unexpectedly.
  - Verify saved quote previews still read well for managers who rely on the compatibility summary before fully structured quote UI lands in every surface.

## Assumptions
- Phase 1 should store richer quote intake as structured metadata now, not as a temporary text-only expansion of `description`.
- The generated `description` summary remains necessary until all manager/client quote readers are fully proposal-aware.
- The current three-step flow is the right level of friction for higher-quality quote intake without turning the public form into a full pre-sales portal.
