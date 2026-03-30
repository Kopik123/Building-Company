# Auth Account Panel Card Navigation

## Summary
- Goal: rebuild the logged-in account management surface into card-based navigation instead of one long stacked panel.
- Scope: `auth.html`, `auth.js`, `styles/workspace.css` and the matching Playwright auth coverage.
- Constraints: keep the existing legacy auth/session flow working during the cutover period and preserve role-aware workspace shortcuts for both client and manager users.

## Key Changes
- Replace the old single stacked account settings area with a two-column layout: a quick-access navigation card on the left and dedicated account cards on the right.
- Add four account cards: `Overview`, `Profile`, `Security` and `Workspace`, with stateful switching driven from the quick-access panel instead of rendering all forms at once.
- Keep manager quick-access shortcuts available, but move them into the dedicated `Workspace` card so account editing and workspace jumping no longer compete inside one block.
- Add account summary fields and primary workspace actions so the first visible card gives the user a short role-aware overview instead of dropping straight into forms.
- Update browser regression coverage to prove the auth page now opens on `Overview` and can switch between cards via the quick-access buttons for both client and manager sessions.

## Test Plan
- Automated: focused Playwright auth coverage in `tests/playwright/mobile-smoke.spec.js`.
- Automated: full `npm.cmd run test:e2e:mobile` regression to confirm the account-panel refactor does not break the broader browser flows.
- Manual: open `auth.html` while logged in as client and manager, switch cards from the quick-access panel, and confirm role-specific workspace shortcuts still open the correct route.

## Assumptions
- This request targets the current legacy/public auth account page, not the future fully unified native `web-v2` account area.
- A card-based account panel is the right short-term improvement for the current legacy auth surface, even though a future route-based account area inside `web-v2` would be a cleaner long-term architecture.
