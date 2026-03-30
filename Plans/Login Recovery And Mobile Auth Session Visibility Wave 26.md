# Login Recovery And Mobile Auth Session Visibility Wave 26

## Summary
- Goal: restore a clear, working login experience after the latest public-shell and manager-shell UI changes.
- Scope: mobile public auth visibility, auth-flow regression coverage, and legacy auth bridge stability checks.
- Constraints: keep the current legacy auth API contract unchanged and avoid breaking `/auth.html`, brochure pages, or future mobile-app-ready session flows.

## Key Changes
- Keep the authenticated public auth panel visible on mobile brochure pages instead of hiding it behind the collapsed auth toggle after login.
- Add a real Playwright regression for `auth.html` login submit so the flow is covered beyond mocked post-login state.
- Tighten the legacy auth bridge test stubs so `/api/auth/me` coverage matches the real middleware lookup path.

## Test Plan
- Automated:
  - `node --test tests/api-v2/legacy-auth-session-bridge.test.js`
  - `node --test tests/api-v2/auth-flow.test.js`
  - `node scripts/run-playwright.js -c tests/playwright/playwright.config.js --grep "auth page login submit restores the account panel and redirects through next|authenticated public shell hides login-only controls and keeps one account route|auth page shows account panel for logged session|auth page restores the session from v2 refresh when the legacy token is stale"`
- Manual:
  - verify live brochure-page login on mobile and desktop shows a visible signed-in state instead of appearing to fail silently.

## Assumptions
- The most likely user-facing regression is the post-login UI state on the public shell, not a changed credential-validation rule.
