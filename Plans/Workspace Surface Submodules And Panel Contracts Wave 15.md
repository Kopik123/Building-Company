# Workspace Surface Submodules And Panel Contracts Wave 15

## Summary
- Goal: finish the next `web-v2` refactor pass by splitting the remaining larger `list/detail/editor` render surfaces and by tightening panel-level JSDoc contracts.
- Scope: `quotes`, `crm`, `private-inbox` and `inventory` render layers plus the matching workspace panel adapter modules.
- Constraints: keep the current `api/v2` behavior, route/controller boundaries and Playwright coverage unchanged while reducing page and surface complexity.

## Key Changes
- Split the quote detail surface into smaller render modules for the editable form and the readonly client summary.
- Split the CRM client surface into dedicated list, editor and activity submodules, keeping the existing manager-side editing flow intact.
- Split the private inbox conversation surface into a dedicated message-list module and a dedicated composer module.
- Split the inventory service/material surfaces into separate list and editor modules so those rollout-shell panels stop carrying both halves inline.
- Strengthen `quote`, `crm`, `private-inbox` and `inventory` panel adapters with explicit JSDoc typedefs for the section-level panel contracts.

## Test Plan
- Automated: run `npm.cmd run build` inside `apps/web-v2`.
- Automated: run `node scripts/run-playwright.js -c tests/playwright/playwright.config.js --grep "web-v2"`.
- Manual: spot-check the new split files for import wiring and unchanged action labels before commit.

## Assumptions
- The current controller-hook and action-hook boundaries stay as the source of truth; this wave only narrows render surfaces and documented panel contracts.
- Legacy HTML dashboards remain compatibility-only and are out of scope for this wave.
- If a surface still needs deeper extraction later, it should happen after this panel-contract pass rather than by expanding page modules again.
