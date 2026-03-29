# Manager Header Duplicate Panel Removal Wave 24

## Summary
- Goal: remove duplicated manager quick-access/account panels from `manager-dashboard.html` so the sticky header stays slim and the left workspace rail remains the single management navigation surface.
- Scope: manager workspace header markup, shared public-shell quick-access logic, responsive workspace header layout and manager Playwright coverage.
- Constraints: preserve brochure navigation links, keep account/session actions available from the workspace rail, and avoid changing the `auth.html` manager quick-access experience.

## Key Changes
- Remove the manager-only utility/account panel markup from `manager-dashboard.html`, leaving the sticky header focused on brand, search and brochure navigation.
- Stop `site.js` from creating/rendering the shared public-header quick-access panel on manager workspace routes; keep that panel only for brochure surfaces.
- Tighten `styles/workspace.css` so the manager header grid matches the slimmer two-column shell instead of reserving space for removed utility/auth controls.
- Update Playwright manager workspace smoke tests so they assert there is no duplicated header quick-access panel and that the left quick-access rail still routes to manager cards.

## Test Plan
- Automated: `node --check site.js`
- Automated: `git diff --check`
- Automated: `node scripts/run-playwright.js -c tests/playwright/playwright.config.js --grep "manager dashboard mobile menu opens|manager dashboard keeps one quick-access rail without duplicating it in the header"`
- Manual: verify `manager-dashboard.html` shows a slim top bar plus one left quick-access rail on desktop and mobile.

## Assumptions
- `manager-dashboard.html` should keep brochure links in the sticky header, but manager operational navigation belongs in the workspace rail, not duplicated in the header.
- `auth.html` remains the place for the richer manager account/quick-access panel outside the manager workspace shell.
