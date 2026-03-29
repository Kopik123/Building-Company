# Web-v2 Controller Hook And JSDoc Contract Wave 12

## Summary
- Goal: continue the `web-v2` refactor by moving the last page-level orchestration seams into controller hooks and formalising the new panel layer with initial JSDoc contracts.
- Scope: `quotes`, `crm`, `private-inbox`, `inventory`, their workspace pages, and the panel builder modules under `apps/web-v2/src/workspace/view-models/`.
- Constraints: keep all current `api/v2` behavior unchanged, avoid any route or UX changes, and use this wave to tighten ownership boundaries rather than introduce new features.

## Key Changes
- Add dedicated controller hooks for `quotes`, `crm`, `private-inbox` and `inventory` that compose `auth + state hook + action hook + panel adapter`.
- Reduce the four matching route pages to thin render shells that only call a controller hook and pass the resulting panels into the existing surface components.
- Add initial JSDoc typedef contracts to the panel adapter modules and use imported JSDoc return types in the new controller hooks, so the new boundaries have an explicit documented shape.
- Keep render surfaces, API payloads and mutation behavior unchanged in this wave so the existing `web-v2` regression suite remains the source of truth for behavior.

## Test Plan
- Automated: `npm.cmd run build` in `apps/web-v2`.
- Automated: `node scripts/run-playwright.js -c tests/playwright/playwright.config.js --grep "web-v2"`.
- Manual: no separate manual pass in this wave because the touched domains are already covered by the full `web-v2` rollout suite.

## Assumptions
- Controller hooks are the right next step after state hooks, action hooks and panel adapters because they let route pages become genuinely thin shells instead of still acting as mini-composers.
- Initial JSDoc typedefs are a worthwhile intermediate step before any later stronger generated or runtime-checked typed contracts.
