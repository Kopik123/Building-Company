# Web-v2 Parity Sprint - Overview, Inbox And Notifications

## Summary
- Goal: move `apps/web-v2` from rollout shell into a usable authenticated workspace and lock the first real parity slice against the legacy dashboards.
- Scope: parity mapping for `overview`, `projects`, `quotes`, `messages`, `notifications`, `crm`, `inventory`, role-aware navigation and file-send support.
- Constraints: keep legacy dashboards online, keep the rollout path under `/app-v2`, and reuse the current `api/v2` contract instead of starting a framework rewrite.

## Parity Map
- `role-aware navigation`
  web-v2 now has a real role-aware shell with `Overview`, `Account`, `Projects`, `Quotes`, `Inbox`, `Notifications`, `Services`, plus `CRM` and `Inventory` for staff roles.
- `overview`
  legacy dashboards had richer top boards; web-v2 now has a comparable top-level overview with metrics, route cards, project previews, mailbox previews and alert summaries.
- `projects`
  web-v2 now has richer summary cards and filtering, but still lacks create/edit/media/document workflows.
- `quotes`
  web-v2 now has richer quote summaries, but still lacks manager update actions and estimate/approval flow parity.
- `messages`
  web-v2 now supports group/project thread summaries, thread history, optimistic send and attachment upload; it still lacks direct/private thread parity, thread creation and participant-management UI.
- `notifications`
  web-v2 now supports unread counts, per-item read and mark-all-read actions; deeper action routing remains open.
- `crm` and `inventory`
  web-v2 now surfaces read-only operational boards, but CRUD parity is still open.

## Key Changes
- Enriched `api/v2/messages` so thread list responses now include preview, latest sender, message count, project/quote context and membership metadata for the rollout shell.
- Returned `sender` from `POST /api/v2/messages/threads/:id/messages` and `/upload` so web-v2 can render optimistic message updates without an extra reload.
- Rebuilt `apps/web-v2` around a real workspace shell: new overview route, stronger sidebar/navigation, richer project and quote boards, a two-pane inbox and actionable notifications.
- Added API regressions for the new v2 thread-summary contract and sender-return behavior.

## Test Plan
- `npm.cmd run build` in `apps/web-v2`
- `npm.cmd run test:ci`
- `npm.cmd run test:e2e:mobile`

## Assumptions
- `web-v2` remains staged under `/app-v2` until auth/session ownership and deeper CRUD parity are ready for a broader cutover.
- Direct/private thread parity stays temporarily on legacy routes until `api/v2` grows the missing contract surface.
- A shared typed contract layer (`TypeScript` + `OpenAPI` or `Zod`) is still the next better technology move before larger parity waves.
