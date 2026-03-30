# Web-v2 Parity Sprint - Private Inbox And Direct Messaging

## Summary
- Goal
  Ship the next `web-v2` parity wave by moving direct/private inbox flows onto `api/v2` and the rollout shell under `/app-v2`.
- Scope
  Add private-thread list/history/send/upload/read contracts in `api/v2`, wire a real `Private Inbox` experience into `apps/web-v2`, and lock the contract with regression coverage.
- Constraints
  Keep legacy dashboards online, preserve the current private-thread data model, avoid breaking `mobile-v1`, and keep the new flow portable for a future native client.

## Key Changes
- Added `api/v2` direct-thread routes for listing, creating, reading, sending, uploading attachments and marking private threads as read.
- Added a real `Private Inbox` route in `web-v2`, including role-aware composer behavior for client-to-manager and staff-to-client/staff direct routes.
- Extended the rollout overview and navigation so private-thread summaries are visible alongside project-chat summaries.
- Added direct-thread regression coverage and documented the new contract in `api/v2/README.md`.
- Kept the next better-technology step explicit: introduce one shared typed contract layer (`TypeScript` types plus `OpenAPI` or `Zod`) before the next broader parity wave, but do not block this sprint on that migration yet.

## Test Plan
- Automated
  Run `npm.cmd run build` in `apps/web-v2`, `node --test tests/api-v2/direct-thread-contract.test.js`, `npm.cmd run test:ci`, and `npm.cmd run test:e2e:mobile`.
- Manual
  Verify `/app-v2/private-inbox` for both client and staff roles, including thread creation, unread clearing, message send and attachment-first thread creation.

## Assumptions
- Legacy private inbox behavior remains the compatibility baseline; this sprint ports that behavior into `api/v2` rather than redesigning permissions.
- One-to-one direct threads do not need participant-management UI, so the next parity gaps stay focused on manager CRUD and deeper CRM/inventory actions.
