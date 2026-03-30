# Estimate Versioning And Explicit Quote Approval

## Summary
- Goal: close the remaining `quote -> estimate -> approval -> project` gap by making estimate versions explicit, superseding older offers cleanly, and separating manager send notes from client decision notes.
- Scope: estimate model/migration updates, `api/v2` quote-estimate lifecycle rules, `web-v2` quote history UI, and regression coverage for versioned approval behavior.
- Constraints: keep the current quote/project conversion flow working, preserve backwards-compatible list/detail payloads for `web-v2`, and avoid introducing a larger generated contract package before the lifecycle settles.

## Key Changes
- Extend `Estimate` with `superseded` status support plus `decisionNote`, `supersededById` and `supersededAt`, backed by a new migration and matching indexes.
- Change `api/v2/routes/quotes.js` so drafting a new estimate version automatically moves the previous current version into history instead of leaving multiple actionable estimates alive at the same time.
- Tighten estimate lifecycle rules so only the current draft can be sent and only the current sent estimate can receive a client decision.
- Preserve the manager-facing send note in `clientMessage` and store the client’s explicit acceptance / revision / decline note separately in `decisionNote`.
- Update `web-v2` quote detail so estimate history clearly shows current vs historical versions, manager notes, decision notes and the effect of drafting a new version.
- Harden the gallery brochure regression for WebKit by checking state change rather than a brittle one-click image-title assumption while the animated gallery stage is moving.

## Test Plan
- Automated: `node --test tests/api-v2/quotes-rbac-crud.test.js`
- Automated: `node --test tests/api-v2/migrations-quote-table-compat.test.js`
- Automated: `npm.cmd run build` in `apps/web-v2`
- Automated: `npm.cmd run test:ci`
- Automated: `npm.cmd run test:e2e:mobile`

## Assumptions
- The best next step is to finish estimate versioning before attempting the larger generated contract-package work, because mobile portability needs a stable business contract first.
- A superseded estimate should remain visible in history, but it should no longer be actionable for client approval or manager resend flows.
- The remaining guest-portal parity work stays separate; this round focuses on the authenticated offer lifecycle and shared estimate semantics.
