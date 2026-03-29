# Manager Quote Thumbnail Preview Wave 32

## Summary
- Goal: show quote photo thumbnails directly inside the manager quote review panel.
- Scope: legacy manager quote API payloads, manager dashboard quote-card rendering, thumbnail UI polish, and regression coverage.
- Constraints: keep staged `new_quotes` previews working and avoid changing accept/reject business logic.

## Key Changes
- Include normalized quote attachments in legacy manager quote list/detail responses so the dashboard can render previews for older quotes as well as staged requests.
- Refresh the manager quote preview renderer to show up to four thumbnails, fall back cleanly for non-image files, and show a `+N more` card when more attachments exist.
- Add API and browser regressions covering manager quote attachment previews.

## Test Plan
- Automated: `node --check routes/manager.js`
- Automated: `node --check routes/manager/quote-routes.js`
- Automated: `node --check manager-dashboard.quotes.js`
- Automated: `node --check tests/api-v2/manager-quotes-include-attachments.test.js`
- Automated: `node --test tests/api-v2/manager-quotes-include-attachments.test.js`
- Automated: `node scripts/run-playwright.js -c tests/playwright/playwright.config.js --grep "manager dashboard quote controls can accept and update a quote"`
- Manual: open manager quote review and confirm thumbnails appear for quotes with attached photos.

## Assumptions
- Manager quote cards should surface reference-photo previews inline instead of requiring the manager to open each quote blindly.
- Four thumbnails plus a `+N more` summary is a better density/readability tradeoff than rendering the entire attachment set in every card.
