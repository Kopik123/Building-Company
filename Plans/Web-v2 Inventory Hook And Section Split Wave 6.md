# Web-v2 Inventory Hook And Section Split Wave 6

## Summary
- Goal: continue the `web-v2` refactor by giving `inventory` the same state/render split already applied to `quotes`, `CRM` and `private inbox`.
- Scope: `apps/web-v2/src/workspace/pages/inventory.jsx` plus the first dedicated hook and render-section component files for inventory.
- Constraints: keep the existing inventory CRUD contract unchanged, preserve the green `web-v2` rollout suite, and leave finer-grained list/detail/editor decomposition as explicit follow-up work.

## Key Changes
- Add `use-inventory-workspace-state.js` so selection, create-mode, async loading, search filtering and form-sync effects move out of `inventory.jsx`.
- Add `inventory-sections.jsx` so the service/material render surfaces stop living inline in the page file.
- Rewire `inventory.jsx` into a thinner orchestration page that keeps save/delete actions but passes grouped `servicePanel` and `materialPanel` view-model props into the new render layer.
- Trim the page import surface so `inventory.jsx` only imports the kit helpers it actually uses after the extraction.

## Test Plan
- Automated: `npm.cmd run build` in `apps/web-v2`.
- Automated: `node scripts/run-playwright.js -c tests/playwright/playwright.config.js --grep "web-v2"`.
- Manual: no extra manual pass in this wave because the full `web-v2` rollout browser suite covers the touched inventory routes.

## Assumptions
- The inventory screen is the safest next domain for this split because it has strong parity coverage in the `web-v2` rollout suite.
- Passing grouped `servicePanel` / `materialPanel` objects is an acceptable intermediate state before the later move to smaller list/detail/editor components or typed view-model adapters.
