# Web-v2 Render Section Split Wave 5

## Summary
- Goal: continue the `web-v2` refactor by moving the largest page-level JSX surfaces into domain render-section components.
- Scope: `quotes`, `CRM` and `private inbox` only, while keeping their action handlers and API contracts in the page modules.
- Constraints: preserve browser behavior, keep the full `web-v2` rollout suite green, and leave `inventory` plus prop/import slimming as explicit follow-up work.

## Key Changes
- Add domain render-section component files for `quotes`, `CRM` and `private inbox`.
- Rewire the matching page modules so they render through those section components instead of holding the largest JSX surfaces inline.
- Keep business actions in the page modules for this wave; only the render layer moves out.
- Record the remaining work honestly: `inventory` still needs the same treatment, and the current page/component boundaries still pass broad prop bags.

## Test Plan
- Automated: `npm.cmd run build` in `apps/web-v2`.
- Automated: `node scripts/run-playwright.js -c tests/playwright/playwright.config.js --grep "web-v2"`.
- Manual: no extra manual pass in this wave because the browser rollout suite covers the touched areas.

## Assumptions
- Render-section extraction is the safest next step after the earlier page-file split and domain-hook extraction.
- Passing broad prop objects is acceptable for now as an intermediate state before smaller list/detail/editor components and typed view-model adapters.
