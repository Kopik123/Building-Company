# Web-v2 Domain Action Hook Extraction Wave 11

## Summary
- Goal: continue the `web-v2` refactor by moving page-level domain actions out of the workspace pages and into dedicated action hooks.
- Scope: `quotes.jsx`, `crm.jsx`, `private-inbox.jsx`, `inventory.jsx`, plus new action hook files under `apps/web-v2/src/workspace/hooks/`.
- Constraints: keep runtime behavior unchanged, preserve the current `api/v2` contracts and treat this wave as orchestration cleanup rather than a UX or data-model rewrite.

## Key Changes
- Add dedicated action hooks for `quotes`, `crm`, `private inbox` and `inventory` under `apps/web-v2/src/workspace/hooks/`.
- Rewire the four matching workspace pages so they compose `auth + state hook + action hook + panel adapter` instead of defining async submit/save flows inline.
- Keep page modules focused on route-level orchestration while action hooks own mutation payloads, API calls, optimistic list updates and success/error messaging.
- Leave render surfaces and panel adapters unchanged in this wave so the existing `web-v2` rollout suite remains the primary regression safety net.

## Test Plan
- Automated: `npm.cmd run build` in `apps/web-v2`.
- Automated: `node scripts/run-playwright.js -c tests/playwright/playwright.config.js --grep "web-v2"`.
- Manual: no separate manual pass in this wave because the touched surfaces are already covered by the full `web-v2` Playwright rollout suite.

## Assumptions
- Extracting domain actions is the right next step after state hooks and panel adapters, because the workspace pages should now trend toward thin orchestration shells.
- This wave intentionally stops short of changing contracts or adding new UI; the value is cleaner ownership boundaries before any later typed contracts or list/detail/editor refinements.
