# Guest Quote Private Preview Link And Follow Up Panel

## Summary
- Goal: give public quote submissions a private follow-up state instead of ending the flow at a single success message.
- Scope: legacy public quote API preview payload, public quote form UX on `quote.html` and generated service/location pages, brochure styling, and API/UI regression coverage.
- Constraints: keep the current guest/public token model, avoid introducing the full claim workspace yet, and preserve mobile-safe behavior across brochure forms.

## Key Changes
- Extend `GET /api/quotes/guest/:publicToken` so guest preview responses include attachment metadata and photo counts, not only bare workflow/status fields.
- Add a reusable quote follow-up panel to brochure quote forms that shows reference, workflow, timestamps, photo count, previewed attachments and a private link based on `publicToken`.
- Update `quote.js` so public quote submit now renders the follow-up panel immediately after success and restores that panel from `?quote=<publicToken>` on later visits.
- Keep the current claim flow deferred; surface only the private preview link and a clear sign-in path for the later claim step.

## Test Plan
- Automated: `npm.cmd run generate:public-pages:content`
- Automated: `npm.cmd run verify:generated`
- Automated: `node scripts/run-playwright.js -c tests/playwright/playwright.config.js --grep "quote page shows a private guest quote preview after submit and from the saved quote link|service, location and legal pages keep the same shell and single primary consultation route"`
- Automated: `npm.cmd run test:ci`

## Assumptions
- The most useful next step after photo upload is a private guest preview/status layer, not the full claim workflow UI yet.
- Reusing the existing `publicToken` is the right short-term bridge for future guest portal parity because it keeps the contract portable for later Android/iOS clients.
- Full guest quote claim/reply workspace still remains a later phase; this change intentionally stops at private preview plus a clear return path.
