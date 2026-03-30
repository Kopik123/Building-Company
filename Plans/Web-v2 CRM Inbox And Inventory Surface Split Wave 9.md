# Web-v2 CRM Inbox And Inventory Surface Split Wave 9

## Summary
- Goal: continue the `web-v2` refactor by bringing the remaining larger workspace render layers up to the same subcomponent granularity as `quotes`.
- Scope: `crm-sections.jsx`, `private-inbox-sections.jsx` and `inventory-sections.jsx`, plus new domain subfolders under `components/`.
- Constraints: keep `pages/*.jsx` as orchestration layers, preserve the existing `api/v2` flows, and leave typed view-model adapter work for a later wave.

## Key Changes
- Create dedicated CRM surface modules for summary, create-staff, clients and staff under `apps/web-v2/src/workspace/components/crm/`.
- Create dedicated private-inbox surface modules for sidebar and conversation under `apps/web-v2/src/workspace/components/private-inbox/`.
- Create dedicated inventory surface modules for services and materials under `apps/web-v2/src/workspace/components/inventory/`.
- Reduce `crm-sections.jsx`, `private-inbox-sections.jsx` and `inventory-sections.jsx` to thin composition shells that only wire the new domain surfaces together.

## Test Plan
- Automated: `npm.cmd run build` in `apps/web-v2`.
- Automated: `node scripts/run-playwright.js -c tests/playwright/playwright.config.js --grep "web-v2"`.
- Manual: no separate manual pass in this wave because the full rollout suite exercises the touched CRM, inbox and inventory flows.

## Assumptions
- Matching the `quotes` domain-folder pattern across CRM, private inbox and inventory is the right next step before introducing typed view-model adapters.
- This wave should stay purely structural: same contracts, same behavior, smaller component boundaries.
