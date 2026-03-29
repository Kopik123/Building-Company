# Staged New Quote Workflow Deduplication Wave 33

## Summary
- Remove duplicated staged 
ew_quotes accept/reject business logic from both /api/v2/new-quotes and legacy manager review routes.
- Keep the current product behavior intact while moving shared project conversion, attachment carry-over, thread creation, notifications and activity events into one reusable workflow helper.
- Lock both entrypoints with automated regression coverage so later quote changes do not drift again.

## Key Changes
- Added utils/stagedNewQuoteWorkflow.js as a shared workflow for staged quote ccept and 
eject, including project conversion, project-media carry-over, group-thread membership, lifecycle progression, notifications, activity events and staged-attachment cleanup.
- Updated pi/v2/routes/new-quotes.js to use the shared workflow for manager ccept and 
eject while preserving the v2 response shape and client-facing notification/activity copy.
- Updated 
outes/manager/quote-routes.js to use the same shared workflow for staged ccept and 
eject while preserving the legacy manager response shape and internal notification/activity wording.
- Added 	ests/api-v2/manager-staged-new-quotes-review.test.js to cover the legacy manager staged quote entrypoint, while keeping 	ests/api-v2/new-quotes-staging.test.js as the v2 regression pack.

## Test Plan
- Run 
ode --check utils/stagedNewQuoteWorkflow.js.
- Run 
ode --check api/v2/routes/new-quotes.js.
- Run 
ode --check routes/manager/quote-routes.js.
- Run 
ode --test tests/api-v2/new-quotes-staging.test.js.
- Run 
ode --test tests/api-v2/manager-staged-new-quotes-review.test.js.

## Assumptions
- Signed-in client staged quotes should still behave as ccept -> project conversion and 
eject -> staged row deleted + uploaded files cleaned up.
- Legacy manager review remains a compatibility entrypoint for now, but it should not own a separate staged quote business implementation anymore.
- A dedicated object-storage migration can happen later; this wave keeps the current server-file attachment storage unchanged.
