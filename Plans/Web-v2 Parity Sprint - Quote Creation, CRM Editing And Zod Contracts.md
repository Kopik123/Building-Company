# Web-v2 Parity Sprint - Quote Creation, CRM Editing And Zod Contracts

## Summary
- Goal: close the next two manager-facing `web-v2` parity gaps by shipping quote creation and CRM editing, then promote the shared contracts layer from plain normalizers to a Zod-backed runtime package shape.
- Scope: `api/v2` quote and CRM routes, `apps/web-v2` manager quote/CRM surfaces, `shared/contracts` runtime schemas and normalizers, dependency/tooling updates, and rollout coverage updates under `/app-v2`.
- Constraints: keep legacy dashboards online during rollout, avoid a forced repo-wide TypeScript migration mid-sprint, and keep the new contract layer portable to future `mobile-v1` / native clients.

## Key Changes
- Added manager-side quote creation plus richer quote editing through `api/v2` and `web-v2`, so quote operations are no longer limited to status/priority-only updates in the rollout shell.
- Added CRM patch flows for clients and staff, including manager/admin guardrails, so people records can now be maintained directly in `web-v2` without bouncing back to legacy pages.
- Promoted `shared/contracts/v2` into a Zod-backed contract layer that still works in the current JavaScript-first repo but now provides shared runtime validation for `api/v2` and `web-v2`.
- Better technology callout: a generated `TypeScript + OpenAPI` package is still the stronger long-term source of truth once contracts stabilize across backend, web and mobile. Choosing `Zod` now was the better next move because it added runtime guarantees immediately without blocking parity work on a broader TS/tooling migration.

## Test Plan
- `node --test tests/api-v2/crm-rbac-crud.test.js`
- `node --test tests/api-v2/quotes-rbac-crud.test.js`
- `npm.cmd run build` in `apps/web-v2`
- `node scripts/run-playwright.js -c tests/playwright/playwright.config.js tests/playwright/web-v2-rollout.spec.js --project=desktop-chromium`
- `npm.cmd run test:ci`
- `npm.cmd run test:e2e:mobile`

## Assumptions
- `web-v2` remains the target authenticated web shell under `/app-v2`, while legacy dashboards continue serving as a controlled compatibility layer.
- This sprint promotes the contract layer to runtime-validated shared schemas, but does not yet complete the later step of generating one full shared package for backend, web and mobile from a single source of truth.
