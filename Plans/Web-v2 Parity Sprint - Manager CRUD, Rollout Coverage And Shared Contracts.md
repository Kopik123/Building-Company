# Web-v2 Parity Sprint - Manager CRUD, Rollout Coverage And Shared Contracts

## Summary
- Goal: close the next `/app-v2` rollout blockers by adding direct UI regression coverage for messaging routes, shipping the first manager CRUD parity wave in `web-v2`, and preparing a shared typed contract layer for `api/v2`, `web-v2` and future mobile clients.
- Scope: `api/v2` CRUD and validation updates for manager-facing domains, `apps/web-v2` manager operations surfaces, shared response/enum contracts under `shared/contracts`, rollout Playwright coverage, and tracked build artifacts for `/app-v2`.
- Constraints: keep legacy dashboards online during rollout, preserve the current `api/v2` response envelope, and keep new web work portable to a future Android/iOS client without a rewrite.

## Key Changes
- Added direct Playwright rollout coverage for `/app-v2/private-inbox` and `/app-v2/messages`, including unread clearing, attachment-first direct-thread creation, project-thread loading, and manager operations smoke coverage.
- Shipped the first manager CRUD parity wave in `web-v2` across `projects`, `quotes`, `crm` and `inventory`, replacing the previous read-only rollout boards with create/update/delete flows backed by `api/v2`.
- Introduced `shared/contracts/v2.js` plus `shared/contracts/v2.d.ts` as an initial shared contract layer for enums, normalizers and TS-friendly shapes reused by `api/v2` and `web-v2`.
- Better technology callout: the stronger long-term direction is a generated `TypeScript + Zod` or `TypeScript + OpenAPI` contract package shared by backend, web and mobile. It is worth adopting after the current parity wave settles, but the lightweight contract module was the lower-risk step for this sprint because it avoids a forced repo-wide TS migration mid-rollout.

## Test Plan
- `node --test tests/api-v2/crm-rbac-crud.test.js`
- `npm.cmd run build` in `apps/web-v2`
- `node scripts/run-playwright.js -c tests/playwright/playwright.config.js tests/playwright/web-v2-rollout.spec.js --project=desktop-chromium`
- `npm.cmd run test:ci`
- `npm.cmd run test:e2e:mobile`

## Assumptions
- `apps/web-v2` remains the target authenticated web shell under `/app-v2`, while legacy dashboards remain a controlled compatibility layer during parity work.
- The current shared contract layer is intentionally lightweight and runtime-safe; schema generation and full end-to-end contract derivation should happen in a later dedicated step.
