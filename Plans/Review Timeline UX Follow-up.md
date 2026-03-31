# Review Timeline UX Follow-up

## Summary

- Scope: add deep-linking to specific review diffs, timeline filtering, and richer premium compare cards.
- Goal: make revision review faster from dashboard entry points and easier to scan visually.
- Out of scope: changing backend revision persistence or adding a new timeline API.

## Key Changes

- Area 1: Deep-link review entries
  - Add URL params that can point to a specific revision entry.
  - Open the target entry highlighted and scrolled into view from manager/client dashboards.
- Area 2: Timeline filtering
  - Add quote / estimate / client decision filters on review pages.
  - Keep filtering client-side over existing payloads.
- Area 3: Premium diff cards
  - Add changed-field badges, stronger hierarchy, and selected-entry emphasis.
  - Keep component reusable between client and manager review pages.

## Public APIs / Interfaces

- Routes:
  - Reuse current manager/client review payloads.
- UI contracts:
  - Review pages accept `quoteId`, optional `entry`, and optional filter params.
  - Dashboard links may open a review page focused on a specific revision entry.
- Data contracts:
  - Use existing `revisionHistory.createdAt`, `changeType`, `changedFields`, and `snapshot`.

## Test Plan

- `npm run verify:generated`
- `npm run test:api:v2`
- Focused quote/client review route regression checks
- Manual validation for:
  - open specific review diff from dashboard
  - filter timeline states
  - selected-entry highlighting and changed-field badges

## Assumptions

- `createdAt` plus scope is stable enough for deep-linking current revision entries.
- Client-side filtering is sufficient because review payloads already contain revision data.
- Visual polish should stay inside the shared diff component and workspace styles for reuse.
