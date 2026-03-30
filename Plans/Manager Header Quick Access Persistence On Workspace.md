# Manager Header Quick Access Persistence On Workspace

## Summary
- Goal: keep the manager `Account Panel / Quick Access` visible after navigating from brochure pages into `manager-dashboard.html` shortcuts, instead of hiding it as soon as the user lands on the manager workspace.
- Scope: public shell auth/header state in `site.js` plus browser regression coverage for manager quick-access visibility on public pages and inside the manager workspace.
- Constraints: preserve the current public-shell login/session behavior, keep client workspace behavior unchanged, and avoid introducing a second conflicting quick-access contract outside the shared manager link set in `brand.js`.

## Key Changes
- Treat `manager-dashboard.html` as a valid surface for the shared header quick-access panel instead of restricting it to brochure-only pages.
- Keep the header account link hidden for logged-in manager users while the quick-access panel is present, so the shell still exposes one clear management route.
- Add a regression that clicks a header quick-access shortcut on the manager dashboard and proves the panel stays visible after the hash-route change.

## Test Plan
- Automated: `node --check site.js`
- Automated: focused Playwright coverage for manager header quick-access on brochure + manager workspace routes
- Automated: `npm.cmd run test:ci`

## Assumptions
- The user wants the same shared header management panel to persist when moving from brochure pages into manager workspace sections, not a completely separate second panel.
- Client workspace should keep its current behavior; this hotfix is specifically about manager quick-access persistence.
