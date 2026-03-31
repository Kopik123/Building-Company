# Quote Workflow Phase 2 - Estimate Pack Visibility And Draft Builder

## Summary

- Scope: Build the second execution slice of the quote workflow by connecting quotes to the estimate builder more directly and exposing the estimate handoff pack clearly in both manager and client workspaces.
- Goal: Let managers turn a quote into a reusable draft estimate, keep quote cards aligned with the estimate workflow, and let clients see the estimate handoff details without losing compatibility with existing quote and estimate flows.
- Out of scope: Full PDF generation, document upload storage for estimate files, full calendar UI, versioned estimate revisions, and native/mobile-specific screens beyond the shared API-ready contract.

## Key Changes

- Area 1: Quote ↔ estimate backend connection
  - Add a dedicated manager flow to create or reopen a draft estimate directly from a quote.
  - Include estimate summary data when loading quotes so the dashboards can show the current pricing state.
- Area 2: Manager phase-2 workflow surface
  - Expose scope of work, materials plan, labour estimate and estimate link fields directly on quote cards.
  - Add a clear phase-2 action to open or create a draft estimate from the quote card.
- Area 3: Client estimate-pack visibility
  - Show the quote handoff pack and latest linked estimate summary in the client workspace.
  - Keep the structure reusable for future API v2 / mobile client rendering.

## Public APIs / Interfaces

- Routes:
  - Add a manager quote endpoint for draft-estimate creation/reuse.
  - Extend manager and client quote-loading responses with linked estimate summaries.
- UI contracts:
  - Manager quote cards expose estimate-pack fields plus a draft-estimate action.
  - Client quote cards show read-only scope/material/labour/start-date and latest estimate status/total.
- Data contracts:
  - Quotes continue to own workflow metadata.
  - Estimates remain the structured line-item document tied to a quote or project.

## Test Plan

- Generation / build:
  - `npm run verify:generated`
- Automated tests:
  - `npm run test:api:v2`
  - Focused tests for quote-to-estimate draft creation and linked quote visibility
- Manual checks:
  - Create/open a draft estimate from a quote in manager workspace.
  - Confirm manager quote card saves estimate-pack fields.
  - Confirm client quote card shows the latest estimate summary and estimate-pack content.
- Acceptance criteria:
  - Existing estimate builder still works.
  - Manager can create or reopen a quote-linked draft estimate from the quote card.
  - Client can see the estimate handoff pack and current estimate summary.
  - Quote and estimate data stay reusable for future web-v2/mobile clients.

## Assumptions

- Assumption 1: Phase 2 should deepen the current quote workflow instead of starting a separate quote subsystem.
- Assumption 2: The best minimal next step is to connect the existing estimate builder to quotes rather than introducing PDF storage first.
- Assumption 3: The client workspace should stay mostly read-only for estimate pack content in this phase, with negotiation still flowing through the quote decision controls.
