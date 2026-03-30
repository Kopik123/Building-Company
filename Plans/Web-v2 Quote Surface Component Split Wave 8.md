# Web-v2 Quote Surface Component Split Wave 8

## Summary
- Goal: continue the `web-v2` refactor by turning the largest remaining render-section file into smaller quote-domain subcomponents.
- Scope: the quote workspace render layer only, with the existing quote actions and `api/v2` behavior left in `pages/quotes.jsx`.
- Constraints: keep the `web-v2` rollout suite green, avoid changing quote business logic, and leave CRM/private-inbox/inventory subcomponent extraction as explicit follow-up work.

## Key Changes
- Create dedicated quote render components for board, detail, attachments, estimates and timeline under `apps/web-v2/src/workspace/components/quotes/`.
- Reduce `quotes-sections.jsx` to a thin composition shell that stitches those quote-domain surfaces together.
- Keep `quotes.jsx` as the orchestration layer for state and async actions while narrowing the render boundary further.
- Do not change API contracts or form behavior in this wave; this is a structural split only.

## Test Plan
- Automated: `npm.cmd run build` in `apps/web-v2`.
- Automated: `node scripts/run-playwright.js -c tests/playwright/playwright.config.js --grep "web-v2"`.
- Manual: no extra manual pass in this wave because the full `web-v2` rollout browser suite exercises the quote flows end-to-end.

## Assumptions
- The quote render layer is the highest-value next split because it was still the largest component file after the earlier hook, section and prop-surface waves.
- A domain folder under `components/quotes/` is a worthwhile intermediate structure before any later typed view-model or route-level adapter extraction.
