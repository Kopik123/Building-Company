# Web-v2 Workspace View-Model Adapter Wave 10

## Summary
- Goal: continue the `web-v2` refactor by moving page-level panel prop assembly into dedicated workspace view-model adapter modules.
- Scope: `quotes.jsx`, `crm.jsx`, `private-inbox.jsx`, `inventory.jsx`, plus new adapter files under `apps/web-v2/src/workspace/view-models/`.
- Constraints: keep all existing `api/v2` behavior, avoid changing render output or route contracts, and treat this wave as an orchestration cleanup ahead of finer list/detail/editor modules.

## Key Changes
- Add dedicated panel adapter modules for `quotes`, `crm`, `private inbox` and `inventory` under `apps/web-v2/src/workspace/view-models/`.
- Rewire the four matching workspace pages to import those adapter helpers instead of building panel objects inline.
- Keep async actions, hook state and API calls in the page layer, while making panel/view assembly a separate concern that future typed adapters can tighten further.
- Leave render components and hooks behaviorally unchanged in this wave so existing Playwright coverage can validate the refactor as a structural-only pass.

## Test Plan
- Automated: `npm.cmd run build` in `apps/web-v2`.
- Automated: `node scripts/run-playwright.js -c tests/playwright/playwright.config.js --grep "web-v2"`.
- Manual: no separate manual pass in this wave because the existing `web-v2` rollout suite already exercises the touched quotes, CRM, inbox and inventory surfaces.

## Assumptions
- Page-level panel adapters are the right intermediate step before stronger typed/JSDoc view-model contracts or finer list/detail/editor submodules.
- This wave should reduce orchestration noise in `pages/*.jsx` without pretending the whole `web-v2` state model is finished.
