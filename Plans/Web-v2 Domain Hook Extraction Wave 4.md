# Web-v2 Domain Hook Extraction Wave 4

## Summary
- Goal: continue the `web-v2` refactor by extracting page-local state/effect orchestration from the largest authenticated pages into reusable domain hooks.
- Scope: `quotes`, `CRM` and `private inbox` only, while keeping route contracts, render structure and browser behavior unchanged.
- Constraints: preserve `/app-v2` behavior, avoid moving business actions or JSX into risky new abstractions, and validate the result with the full `web-v2` rollout suite.

## Key Changes
- Add dedicated workspace hooks for `quotes`, `CRM` and `private inbox` so page files stop owning all selection, async loading, auto-selection and detail hydration logic inline.
- Keep page modules focused on actions plus rendering, while the new hooks own route-local state and effects.
- Leave the next follow-up explicit: `quotes`, `crm`, `inventory` and `private-inbox` still need smaller list/detail/editor render splits and lighter page-level import surfaces.

## Test Plan
- Automated: `npm.cmd run build` in `apps/web-v2`.
- Automated: `node scripts/run-playwright.js -c tests/playwright/playwright.config.js --grep "web-v2"`.
- Manual: no extra manual pass in this wave because the `web-v2` rollout browser suite covers the touched domains.

## Assumptions
- Domain hooks are the safest next reduction step after the page-file split.
- Business-action handlers can stay in the page modules for now; moving them later should happen only after the state/effect layer is settled.
