# Logged-In Client New Quote Staging And Manager Conversion Wave 30

## Summary
- Goal: stop sending logged-in clients through the guest claim/email quote flow and persist their quote requests in a dedicated `new_quotes` staging store.
- Scope: add `new_quotes` storage, authenticated create/upload routes, client/account visibility, and manager accept/reject actions that delete rejected rows and convert accepted rows into projects.
- Constraints: keep the existing guest quote flow working, keep legacy dashboards functional, and keep the API portable for future Android/iOS clients.

## Key Changes
- Add a `new_quotes` model + migration with `quote_ref`, client snapshot fields and attachment JSON metadata.
- Add authenticated `api/v2/new-quotes` routes for create, list, detail, attachment append, accept and reject.
- Update `quote.js` so signed-in clients submit to the authenticated `new_quotes` route instead of the guest claim/email route.
- Merge staged `new_quotes` into legacy client overview/account visibility and the manager quote review queue.
- Save uploaded `new_quote` photos on the server through the existing `/uploads` pipeline and expose those attachments as manager-visible previews in quote review.
- Convert accepted `new_quotes` into live `Project` records and delete rejected rows from `new_quotes`.

## Test Plan
- Automated: targeted API tests for authenticated new quote create/accept/reject, server-stored attachment persistence/cleanup, client overview visibility and the logged-in quote Playwright flow.
- Manual: verify a signed-in client can submit a quote without email claim, see it in account, and verify a manager can accept or reject it.

## Assumptions
- `new_quotes` is a staging area only for signed-in client quote requests submitted from the public quote page.
- Rejected staged requests should be removed from `new_quotes`, while accepted staged requests should become `Project` records and leave the staging table.
