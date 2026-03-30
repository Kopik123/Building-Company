# Web-v2 Project Workflow, Ownership And Quote-Seeding Parity

## Summary
- Goal: close the next project-focused manager parity gap in `web-v2` by making project lifecycle, ownership and quote-seeded creation match the current operational workflow instead of falling back to legacy-only behavior.
- Scope: `api/v2` project routes, shared contracts, `Project` model + migration, `web-v2` project UI and the matching API/browser regression coverage.
- Constraints: keep the project contract reusable for future Android/iOS clients, preserve the current staged rollout under `/app-v2`, and avoid breaking quote-linked project chat flows while richer project workflow fields are introduced.

## Key Changes
- Add first-class project workflow fields (`projectStage`, `currentMilestone`, `workPackage`, `dueDate`) to the `Project` model plus a migration/backfill and explicit indexes for stage/owner views.
- Extend the shared `api/v2` contract so project workflow data is typed and normalized consistently across backend and `web-v2`.
- Rework `api/v2/projects` so managers and owner-employees can mutate projects with clearer ownership rules, quote-linked project creation can seed client/owner/accepted-estimate defaults, and quote-linked threads can sync into the new project automatically.
- Rework the `web-v2` Projects surface so managers can edit stage, owner, milestone, work package and due date, while also getting a fast "advance stage" path from the rollout board.
- Lock the behavior with migration, API RBAC/lifecycle and rollout-shell browser regressions before closing the matching `Project_todos` items.

## Test Plan
- Automated: `node --test tests/api-v2/projects-rbac-lifecycle.test.js`
- Automated: `node --test tests/api-v2/migrations-quote-table-compat.test.js`
- Automated: `npm.cmd run build` in `apps/web-v2`
- Automated: focused Playwright rollout coverage for manager project operations
- Automated: `npm.cmd run test:ci`

## Assumptions
- Owner-based project mutation for employees should be limited to projects where `assignedManagerId === current user`, while managers/admins retain broader control.
- Quote-linked project creation should prefer reusing quote metadata instead of forcing managers to re-enter the same client/location/estimate context by hand.
- A lightweight staged rollout in `web-v2` is the right step now; a fuller route-based workspace split or generated contract package can come later once the workflow settles.
