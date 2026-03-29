# Manager Menu Simplification And Label Cleanup Wave 25

## Summary
- Goal: simplify the manager workspace menu so it stops showing duplicated navigation blocks and awkward technical shortcut labels.
- Scope: shared manager quick-access labels, manager dashboard rail rendering, manager dashboard bootstrap refs and Playwright regressions for auth/public/manager shells.
- Constraints: keep the shared quick-access config portable between brochure/auth shells and the future mobile-aware account surfaces.

## Key Changes
- Rename manager quick-access labels in `brand.js` to human-friendly names like `Project Board`, `Quote Review`, `Service Catalogue`, `Materials / Stock`, `Private Inbox` and `Project Chat`.
- Remove the duplicated `manager-available-options` block from `manager-dashboard.html` and stop the manager shell from rendering a second shortcut list under the main rail cards.
- Keep the manager rail focused on one primary navigation model: card list + status badges.
- Tighten the manager card descriptions/badges so the menu reads faster and looks less noisy.

## Test Plan
- Automated: `node --check brand.js`
- Automated: `node --check manager-dashboard.js`
- Automated: `node --check manager-dashboard.shell.js`
- Automated: `git diff --check`
- Automated: `node scripts/run-playwright.js -c tests/playwright/playwright.config.js --grep "authenticated manager public shell shows quick access panel and hides plain account link|auth page shows manager quick access panel for logged manager session|manager dashboard mobile menu opens|manager dashboard keeps one quick-access rail without duplicating it in the header|manager dashboard exposes project controls for logged session on mobile"`

## Assumptions
- `auth.html` and brochure pages should still expose manager quick-access shortcuts, but with readable labels.
- `manager-dashboard.html` should keep exactly one left quick-access menu instead of mixing full card navigation with a second legacy shortcut block.
