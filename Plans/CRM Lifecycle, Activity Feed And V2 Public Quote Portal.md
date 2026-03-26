# CRM Lifecycle, Activity Feed And V2 Public Quote Portal

## Summary
- Goal: close another product/workflow wave by adding an explicit CRM lifecycle, a durable activity feed, and live `api/v2/public/quotes` contract paths for the current guest quote portal.
- Scope: backend schema/models, `api/v2` routes, public quote/browser routes, `web-v2` overview/projects/CRM surfaces, shared contracts and regression coverage.
- Constraints: keep current public guest quote UX working during the cutover, do not break legacy dashboards, and avoid pretending the public quote flow is fully domain-native on v2 while it still uses a temporary adapter layer.

## Key Changes
- Added an explicit CRM lifecycle for clients (`lead`, `quoted`, `approved`, `active_project`, `completed`, `archived`) in shared helpers, user model fields and manager-editable CRM flows.
- Added a durable `ActivityEvents` model + migration and exposed company, project and client timelines through new `api/v2/activity` routes.
- Wired activity creation into quote submit/attachments/assignment/estimate/project flows plus CRM updates, so company/client/project timelines are persisted instead of derived only from transient UI state.
- Moved the live public quote browser flows to `/api/v2/public/quotes` paths for submit, preview, follow-up attachments and claim handoff, while keeping the current legacy guest router as a temporary adapter under the new contract path.
- Extended `web-v2` with company-feed, project-activity and client-activity surfaces so the new durable workflow timeline is visible in the rollout shell.
- Kept the longer-term architecture direction explicit: a generated shared contract package (`TypeScript + Zod` or `OpenAPI`) is still the better next technology after these flows stabilise further.

## Test Plan
- Automated:
- `npm.cmd run build` in `apps/web-v2`
- `node --test tests/api-v2/activity-feed.test.js`
- `node --test tests/api-v2/crm-rbac-crud.test.js`
- `node --test tests/api-v2/projects-rbac-lifecycle.test.js`
- `node --test tests/api-v2/quotes-rbac-crud.test.js`
- `node --test tests/api-v2/public-quotes-v2-contract.test.js`
- `npm.cmd run test:ci`
- `npx.cmd playwright test tests/playwright/public-redesign.spec.js --config tests/playwright/playwright.config.js`
- `npx.cmd playwright test tests/playwright/web-v2-rollout.spec.js --config tests/playwright/playwright.config.js`
- `npm.cmd run test:e2e:mobile`
- Manual:
- Leave the broader live QA, screenshot evidence, cache/SEO decisions and Sonar export tasks open in `Project_todos.md`; this round does not claim those manual/external steps as done.

## Assumptions
- The current public guest quote portal is now v2-path compatible, but full guest-portal parity is not declared finished until the temporary legacy router adapter is replaced by a truly native v2 implementation.
- The initial durable activity feed is sufficient to close the current `company/client/project timeline` requirement even though future audit richness can still expand.
- CRM lifecycle portability matters for future native mobile clients, so the lifecycle and activity contracts were kept API-first rather than tied to brochure/dashboard DOM logic.
