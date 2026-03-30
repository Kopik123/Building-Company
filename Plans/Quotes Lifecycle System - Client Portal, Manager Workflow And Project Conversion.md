# Quotes Lifecycle System - Client Portal, Manager Workflow And Project Conversion

## Summary
- Goal: close the main `quote -> estimate -> approval -> project` gap with one portable workflow that works in `api/v2`, `web-v2` and the future mobile app.
- Scope: logged-in client quote submit, manager ownership, estimate drafting/sending, client response, timeline/audit events, and manual conversion of an approved quote into a new project.
- Constraints: keep legacy public/guest quote routes online during the transition, avoid breaking existing legacy dashboards, and keep contracts reusable for future native clients.

## Key Changes
- Added a dedicated quote workflow layer with explicit `workflowStatus`, estimate decision status, quote timeline events and project conversion metadata across `Quote`, `Estimate`, `Project` and the new `QuoteEvent` model.
- Extended `api/v2/routes/quotes.js` so clients and managers can now run the main lifecycle in one contract: create quote, assign ownership, draft estimate, send estimate, respond to estimate and convert an accepted quote into a project.
- Upgraded `shared/contracts/v2` so quote/estimate/project payloads carry the richer lifecycle state with portable Zod-backed validation for `web-v2`.
- Reworked the `web-v2` quotes surface into a real workspace: managers can edit/own quotes, draft/send offers and convert approved work to projects; clients can review estimate state, respond and submit fresh quote requests.
- Added regression coverage for the backend lifecycle and both manager/client rollout-shell quote journeys.
- Kept the guest/public quote flow on the legacy route for now, but aligned it with the new lifecycle metadata so the future cutover to a v2 public quote portal has a compatible backend shape.
- Better technology direction: `TypeScript + Zod` is the right next step now for this workflow because the lifecycle is still evolving quickly; generated `OpenAPI` becomes worth adding once the state machine and public guest flow stop moving as fast.

## Test Plan
- Automated:
  - `node --test tests/api-v2/quotes-rbac-crud.test.js`
  - focused Playwright rollout coverage for manager and client quote flows
  - `npm.cmd run test:ci`
  - `npm.cmd run test:e2e:mobile`
- Manual:
  - verify manager quote ownership, estimate send and project conversion against a real database-backed environment
  - verify client quote approval UX on desktop and mobile breakpoints
  - verify legacy guest submit/preview/claim still works after the lifecycle metadata expansion

## Assumptions
- Logged-in client flow is now the primary non-guest quote portal in `web-v2`.
- Guest/public quote intake remains supported through legacy routes until a dedicated v2 public quote portal is shipped.
- Project creation stays a manager/admin action after approval, not an automatic side effect of estimate acceptance.
