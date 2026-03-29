# Staged New Quote Transaction Safety Wave 34

## Summary
- Wrap staged 
ew_quotes create, accept and reject database writes in transactions so partial quote/project state does not survive failed side effects.
- Keep the current quote product behaviour intact while making the persistence layer safer for both /api/v2/new-quotes and legacy manager review.
- Add targeted regression coverage that proves the transaction wrapper is used by both the shared staged quote workflow and the signed-in create route.

## Key Changes
- Extended utils/stagedNewQuoteWorkflow.js with sequelize.transaction(...) support so staged ccept and 
eject now run project creation, project media carry-over, group-thread membership, notifications, lifecycle updates, activity events and staged-row deletion inside one DB transaction.
- Extended utils/activityFeed.js and utils/crmLifecycle.js to accept optional DB operation options, allowing activity rows and client lifecycle progression to participate in the same transaction as staged quote writes.
- Updated pi/v2/routes/new-quotes.js so the signed-in create flow now wraps NewQuote.create, lifecycle progression, activity feed write and manager notifications in one transaction before hydrating the response.
- Updated legacy manager quote route wiring so 
outes/manager/quote-routes.js receives sequelize and passes it into the shared staged workflow instead of running accept/reject DB writes unwrapped.
- Added 	ests/api-v2/staged-new-quote-workflow-transactions.test.js and 	ests/api-v2/new-quotes-transaction-usage.test.js to lock transaction usage at both the service and HTTP entrypoint layers.

## Test Plan
- Run 
ode --check utils/stagedNewQuoteWorkflow.js.
- Run 
ode --check utils/activityFeed.js.
- Run 
ode --check utils/crmLifecycle.js.
- Run 
ode --check api/v2/routes/new-quotes.js.
- Run 
ode --check routes/manager/quote-routes.js.
- Run 
ode --check routes/manager.js.
- Run 
ode --test tests/api-v2/staged-new-quote-workflow-transactions.test.js.
- Run 
ode --test tests/api-v2/new-quotes-transaction-usage.test.js.
- Run 
ode --test tests/api-v2/new-quotes-staging.test.js.
- Run 
ode --test tests/api-v2/manager-staged-new-quotes-review.test.js.

## Assumptions
- File cleanup for rejected staged quotes remains a post-commit filesystem action; the DB state is now transaction-safe even if later storage cleanup needs retry/logging.
- Signed-in client staged quote submit should still surface the same API response shape and not change the current UI/browser flow.
- Legacy manager review remains a compatibility entrypoint, but it should use the same transaction-safe staged quote workflow as the v2 route layer.
