# Web-v2 Prop Surface Narrowing Wave 7

## Summary
- Goal: continue the `web-v2` refactor by shrinking the remaining broad page/component APIs after the earlier hook and render-section extraction waves.
- Scope: `quotes`, `CRM` and `private inbox`, plus the shared follow-up of replacing giant page-level prop spreads with grouped panel objects.
- Constraints: keep the `api/v2` contracts and rollout behavior unchanged, preserve the green `web-v2` Playwright suite, and leave finer-grained list/detail/editor extraction as the next explicit step.

## Key Changes
- Trim `quotes.jsx`, `crm.jsx` and `private-inbox.jsx` so each page imports only the kit helpers it actually uses after the earlier splits.
- Replace the old broad `...props` pass-through pattern with grouped panel props like `quoteBoardPanel`, `clientsPanel` and `conversationPanel`.
- Rewire `quotes-sections.jsx`, `crm-sections.jsx` and `private-inbox-sections.jsx` so each surface reads its own grouped panel object instead of one giant shared prop bag.
- Keep all async actions and API calls in the page modules; this wave narrows boundaries without changing business behavior.

## Test Plan
- Automated: `npm.cmd run build` in `apps/web-v2`.
- Automated: `node scripts/run-playwright.js -c tests/playwright/playwright.config.js --grep "web-v2"`.
- Manual: no separate manual pass in this wave because the full `web-v2` rollout suite exercises the touched routes end-to-end.

## Assumptions
- Grouped panel props are the right intermediate step before extracting smaller list/detail/editor components or typed view-model adapters.
- `quotes`, `CRM` and `private inbox` are the highest-value targets because they still had the widest page-level import and prop surfaces after Waves 4-6.
