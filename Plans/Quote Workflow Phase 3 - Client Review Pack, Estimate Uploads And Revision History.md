# Quote Workflow Phase 3 - Client Review Pack, Estimate Uploads And Revision History

## Summary

- Scope: Extend the quote and estimate workflow so managers can send a formal estimate pack into client review, attach estimate files, keep quote/estimate revision history, and give clients a clearer review UI.
- Goal: Move the pricing handoff from internal draft preparation to a client-visible review stage without breaking the current quote, estimate, notification, and project conversion flows.
- Out of scope: Automatic PDF generation from estimate lines, advanced diff viewers, digital signatures, and fully separate native/mobile layouts.

## Key Changes

- Area 1: Client review handoff
  - Add a manager action to send an estimate into client review.
  - Align quote workflow state with a dedicated `client_review` stage when the estimate pack is ready.
- Area 2: Estimate files and revision history
  - Store manager-uploaded estimate files directly on the estimate record.
  - Track additive revision history for both quotes and estimates.
- Area 3: Workspace visibility
  - Show estimate file, revision history, and client-review metadata in the manager estimate editor.
  - Rebuild the client quote card into clearer sections for summary, estimate pack, visit changes, decisions, and history.

## Public APIs / Interfaces

- Routes:
  - Add manager estimate document upload and send-to-client-review actions.
  - Extend manager/client quote responses with revision history and richer estimate metadata.
- UI contracts:
  - Manager estimate editor exposes upload, send-to-review, and revision history.
  - Client quote cards show estimate pack, linked file, decision controls, and quote/estimate history in separate sections.
- Data contracts:
  - Quotes and estimates keep additive revision history fields.
  - Estimate file metadata stays portable for future API v2/web-v2/mobile-v1 clients.

## Test Plan

- Generation / build:
  - `npm run verify:generated`
- Automated tests:
  - `npm run test:api:v2`
  - Focused route and migration coverage for client review, estimate upload metadata, and revision history
- Manual checks:
  - Upload a file to an estimate and confirm it appears in manager/client views.
  - Send an estimate to client review and confirm quote workflow changes to `client_review`.
  - Accept / reject / request edit through the new client UI sections and confirm history entries appear.
- Acceptance criteria:
  - Existing draft estimate editing still works.
  - Estimate files are stored safely and exposed only through the linked estimate/quote flows.
  - Quote and estimate revision history grows on meaningful workflow/content changes.
  - Client review handoff is visible and actionable in both workspaces.

## Assumptions

- Assumption 1: Manager file upload is sufficient for this phase; automatic PDF generation can come later.
- Assumption 2: Additive in-record revision history is an acceptable first pass before a heavier audit-log system is introduced.
- Assumption 3: The client workspace should stay focused on review and decision steps rather than full estimate editing.
