# Quote Workflow, Visit Scheduling And Client Manager Coordination

## Summary

- Scope: Expand the current quote lifecycle so manager/client flows can handle visit scheduling, estimate preparation, client decision states, and quote-to-project conversion foundations across legacy dashboards and reusable API-backed data models.
- Goal: Deliver the first execution slice of the requested broader upgrade by creating the workflow foundation in the data model, manager/client routes, and dashboard surfaces without breaking the current quote, project, chat, and notification flows.
- Out of scope: Full PDF cost-estimate generation, full calendar UI, marketing automation, complete SEO redesign, full project-stage templates, and all future mobile-web parity screens in one pass.

## Key Changes

- Area 1: Quote lifecycle foundation
  - Add quote workflow metadata for visit scheduling, client decision tracking, scope/material planning, proposed start date, and archival.
  - Keep the existing legacy `status` field for compatibility while introducing richer workflow fields for the new lifecycle.
- Area 2: Manager / client actions
  - Extend manager quote handling with workflow updates, visit proposal details, and stronger coordination signals.
  - Extend client quote handling with visibility into workflow progress and the first reschedule/request-edit style interaction path.
- Area 3: Workspace visibility
  - Surface richer workflow information in manager and client dashboards so both sides can see visit planning and quote progression.

## Public APIs / Interfaces

- Routes:
  - Extend `/api/manager/quotes/:id/accept`
  - Add `/api/manager/quotes/:id/workflow`
  - Add `/api/client/quotes/:id/workflow`
  - Add quote-to-project conversion support in manager routes
- UI contracts:
  - Manager quote cards show workflow status, visit date and proposed start metadata plus lightweight planning actions.
  - Client quote cards show workflow progress, visit proposal details and decision/reschedule state.
- Data contracts:
  - `Quote` stores workflow metadata separately from the legacy `status`.
  - New quote workflow values stay portable for `api/v2`, `apps/web-v2`, and `apps/mobile-v1`.

## Test Plan

- Generation / build:
  - `npm run verify:generated`
- Automated tests:
  - `npm run test:api:v2`
  - Targeted migration and route coverage for new quote workflow logic
- Manual checks:
  - Accept a quote as manager and confirm workflow metadata appears in the manager workspace.
  - Confirm the client workspace reflects visit scheduling and decision state.
  - Convert an accepted quote into a project and verify the quote is archived.
- Acceptance criteria:
  - Existing quote listing/edit flows keep working.
  - Manager can store visit/estimate workflow details.
  - Client can see the new workflow information.
  - Quote conversion keeps related project/chat coordination intact.

## Assumptions

- Assumption 1: The first execution pass should prioritise backend workflow foundations and minimal dashboard exposure instead of a complete redesign in one step.
- Assumption 2: The current repository should preserve the existing legacy quote `status` enum for compatibility, so richer workflow logic should use additive fields.
- Assumption 3: New workflow data must remain portable to the future native app clients because API v2 is already the shared contract direction.
