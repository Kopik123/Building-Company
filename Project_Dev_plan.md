# Project Dev Plan

## 2026-03-31 (quote workflow phase-3 start)

- Saved `Plans/Quote Workflow Phase 3 - Client Review Pack, Estimate Uploads And Revision History.md` and registered it in `Plans/Plan History.md` as the active execution plan for the third quote workflow slice.
- Added phase-3 follow-up items to `Project_todos.md` for client-review handoff, estimate uploads, revision history, and the rebuilt client decision UI.
- Extended `Estimate` and `Quote` with additive phase-3 fields for client-review timestamps, estimate-file metadata, revision counters and revision history, plus a compatible migration in `migrations/202603311415-phase3-estimate-client-review-and-revisions.js`.
- Added `utils/revisionHistory.js` and wired the manager/client quote + estimate routes so meaningful workflow/content changes append quote/estimate history snapshots instead of overwriting state silently.
- Extended manager estimate APIs with document upload, send-to-client-review, and revision listing support; quote handoff now moves into `client_review` and notifies the client when the estimate pack is ready.
- Updated the manager estimate editor with upload/send/revision sections and rebuilt the client quote card into separated review, estimate-pack, decision, visit-change, and history sections.
- Added focused regression coverage in `tests/api-v2/manager-estimate-client-review.test.js`, updated client workflow assertions, and added migration coverage for the phase-3 schema additions.
- Re-ran `npm ci`, `npm run verify:generated` and `npm run test:api:v2`; the phase-3 quote workflow change set passes the available sandbox validation path.
- Ran automated code review and `codeql_checker`; no review findings or CodeQL alerts remained for the phase-3 change set.

## 2026-03-31 (quote workflow phase-2 start)

- Saved `Plans/Quote Workflow Phase 2 - Estimate Pack Visibility And Draft Builder.md` and registered it in `Plans/Plan History.md` as the active execution plan for the second quote workflow slice.
- Added phase-2 follow-up items to `Project_todos.md` for quote-linked estimate drafting and client estimate-pack visibility.
- Extended manager quote APIs so quote reads include linked estimate summaries and managers can create or reopen a draft estimate directly from `/api/manager/quotes/:id/create-estimate-draft`.
- Updated the manager quote cards to expose the estimate-pack fields (`scopeOfWork`, `materialsPlan`, `labourEstimate`, `estimateDocumentUrl`) and to open/create draft estimates from the quote section instead of switching manually into the estimate builder first.
- Updated client quote visibility so the workspace shows the estimate pack read-only plus the latest linked estimate summary when a pricing pack has been sent or approved.
- Added focused regression coverage in `tests/api-v2/manager-quote-workflow.test.js` for the quote → draft-estimate flow.
- Re-ran `npm ci`, `npm run verify:generated` and `npm run test:api:v2`; the phase-2 quote workflow change set passes the available sandbox validation path.
- Ran follow-up automated review fixes and `codeql_checker`; no CodeQL alerts were reported for the phase-2 quote workflow change set.

## 2026-03-31 (quote workflow phase-1 start)

- Saved `Plans/Quote Workflow, Visit Scheduling And Client Manager Coordination.md` and registered it in `Plans/Plan History.md` as the active execution plan for expanding the quote lifecycle.
- Recorded the new follow-up checklist in `Project_todos.md`, including the phase-1 workflow workstream.
- Added the phase-1 quote workflow foundation across `models/Quote.js`, `migrations/202603310001-quote-workflow-phase1.js`, manager/client quote routes, and manager/client dashboard quote cards.
- Extended quote handling so manager acceptance now opens a private client-manager thread when possible, workflow updates notify the client, client reschedule/decision updates notify the assigned manager, and accepted quotes can be converted into archived projects.
- Added regression coverage for the new workflow paths in `tests/api-v2/manager-quote-workflow.test.js`, `tests/api-v2/client-overview-include-threads.test.js` and `tests/api-v2/migrations-quote-table-compat.test.js`.
- Re-ran `npm ci`, `npm run verify:generated` and `npm run test:api:v2`; generated-page verification and the API suite now pass in the sandbox with dependencies installed.
- Ran automated code review follow-up fixes and `codeql_checker`; no CodeQL alerts were reported for the final quote workflow phase-1 change set.

## 2026-03-30 (execution pass)

- Executed 21 out of 49 items from the full project analysis (`copilot_todos.md`).
- Cleaned up the latest Sonar findings in `routes/auth.js`, `routes/manager/project-routes.js` and `routes/manager/quote-routes.js` by removing the hard-coded HMAC key pattern, simplifying `undefined` comparisons, reducing media-handler complexity and using optional chaining for the quote accept flow.
- Fixed `safeCompare()` timing leak in `routes/auth.js` – now uses SHA-256 digests to normalise both inputs before constant-time comparison regardless of input lengths.
- Fixed `createClaimCode()` in `routes/quotes.js` to use `crypto.randomInt()` instead of `Math.random()` for cryptographically secure OTP codes.
- Removed unused `cookie-parser` dependency from `package.json`.
- Fixed font-family declarations in `styles/base.css`: replaced `Inter` → `Montserrat` and `Playfair Display` → `Cormorant Garamond` to match the fonts actually loaded in HTML.
- Added `<link rel="icon">` (favicon) to all 20 HTML files and the page generator template.
- Added `<link rel="preload">` for LCP `title.avif` image to all 17 public pages and the generator.
- Changed `<html lang="en">` to `<html lang="en-GB">` across all 20 HTML files and the page generator.
- Added warning comment to the `bootstrap/rotate-key` endpoint about non-persistent key mutation.
- Fixed PORT validation in `server.js` to reject invalid values (range 1–65535).
- Updated `robots.txt` to block `/api/`, `/uploads/` and dashboard pages from search crawlers.
- Extracted duplicated SMTP transporter logic from `routes/contact.js` and `routes/quotes.js` into shared `utils/mailer.js`.
- Completed the `routes/manager.js` split by extracting `quote-routes.js` (215 lines) and `project-routes.js` (494 lines), reducing the main file from 1151 to 568 lines.
- Removed dead files and directories: `styles.css`, `.anima/`, `backup/logos/`, `iteBuilding-Company/`, `code/dev_plan/`, `todos.md`, `dev_plan.md`.
- Created `what_missing_copilot.md` documenting 28 deferred items that require live environment, infrastructure or architectural decisions.
- Updated `copilot_todos.md` with completion status for all 49 items (21 done, 28 deferred).

## 2026-03-30

- Created `copilot_todos.md` with 49 categorised items from a full project analysis covering security bugs, architectural issues, cleanup targets, SEO/performance gaps and mobile/app readiness.

## 2026-03-10

- Added `scripts/setup-vscode.ps1` to install the recommended VS Code extensions and merge workspace settings.
- Added `.vscode/extensions.json` so the repository recommends the UI, formatting and Playwright tooling needed for this project.
- Expanded `.vscode/settings.json` with shared editor defaults while preserving the existing repository-specific settings.
- Added `Project_todos.md` as a checklist for follow-up actions related to the VS Code bootstrap.
- Saved the new premium marble theme plan in `Plans/Premium Marble - Dark Gold Theme Replan.md` and registered it in `Plans/Plan History.md`.
- Reworked the shared design tokens in `styles/tokens.css` around a darker black-led palette, marble surfaces and muted dark-gold accents.
- Applied the premium marble / dark-gold shell consistently in `styles/public.css` for the public header, homepage panels, quote/contact surfaces and footer.
- Applied the same premium system in `styles/workspace.css` so auth and dashboard shells inherit the same brand language with calmer operational cards.
- Updated `tests/playwright/public-redesign.spec.js` to validate the evolved homepage hero language and keep regression coverage aligned with the new visual direction.
- Re-ran generated page verification, API tests and mobile Playwright coverage to confirm the theme pass did not break public or workspace behaviour.
- Updated `AGENTS.md` with a permanent platform-direction rule: build current web features so they stay reusable for the planned future Android/iOS app.
- Added the matching checklist item in `Project_todos.md` so app-readiness is reviewed continuously, not only at planning time.
- Reworked the homepage brand hierarchy in `index.html` so the header is cleaner, `title.png` sits in the hero and the `Account` card now owns login plus the public route links.
- Updated `styles/public.css` to support the new homepage-only shell: hidden desktop title in the header, new hero lockup treatment, and the moved account navigation block.
- Updated `tests/playwright/mobile-smoke.spec.js` and `tests/playwright/public-redesign.spec.js` so regression coverage follows the new homepage structure instead of the old header utility layout.
- Re-ran the Playwright mobile/desktop suite after the homepage restructure and restored tracked test artifacts back to the repository state.
- Saved `Plans/Professional Client Proposal Quote Form Plan.md` to define the professional quote intake model, phased form UX and portable `client_proposal_quote` data contract.
- Registered the quote form plan in `Plans/Plan History.md` and linked the next implementation tasks into `Project_todos.md`.
- Added explicit `HOST` handling in `server.js` so deploys no longer rely on implicit bind behaviour for `app.listen`.
- Set `HOST=127.0.0.1` in `ecosystem.config.js` for PM2 and `HOST=0.0.0.0` in Docker compose files so both droplet and container flows stay predictable.
- Updated `README.md` and the follow-up checklist with the new host-binding rule and the need for `pm2 restart --update-env` after deployment.
- Reworked the shared site shell so public pages, legal pages and workspace pages all use the same `logo | title | account/nav` header structure instead of the earlier homepage-specific exception.
- Updated `brand.js`, `scripts/publicPages.shared.js`, `scripts/publicPageRenderer.js` and the manual HTML files so the guest-facing auth label is consistently `Account`.
- Regenerated the public service/location pages and re-ran the API + Playwright suites after the shell change to verify desktop and mobile behaviour.
- Added `/healthz` in `app.js` as a simple process-level health endpoint with `no-store` caching, alongside the existing `/api/v2/health`.
- Extended the legacy app tests and deploy documentation so droplet checks can use `/healthz` directly, while leaving the Nginx upstream on `127.0.0.1:3000` because that is the listener confirmed by `ss`.

## 2026-03-11

- Replaced the old manager workspace hero/session block with a new operational overview board in `manager-dashboard.html` made of `Company Events`, `Mail Box` and `Available Options`.
- Added anchor targets for the main manager sections so the new overview cards can jump directly into projects, quotes, services, materials, clients, staff, estimates and both chat modes.
- Extended `manager-dashboard.js` with overview rendering helpers for company activity, mailbox previews and role-aware available options, using real loaded data rather than static placeholder text.
- Kept the new mailbox top card light on bootstrap by loading only thread summaries first, then leaving full message history to the existing lower lazy-loaded inbox/chat sections.
- Added manager-specific workspace styling in `styles/workspace.css` so the new overview board uses the same dark-gold operational shell and responsive stacking on desktop and mobile.
- Updated `tests/playwright/mobile-smoke.spec.js` so the manager dashboard regression suite checks the new overview structure and summary counters.
- Re-ran `cmd /c npm run test:ci` and `cmd /c npm run test:e2e:mobile` after the manager dashboard overview refactor and kept both gates green.
- Diagnosed the droplet deploy logs and confirmed the process now binds to `127.0.0.1:3000`, while the remaining failed `curl` is consistent with an immediate post-restart timing race rather than a broken listener.
- Recorded that local live QA through MCP Playwright is currently blocked on the workstation because the expected Chrome executable is missing, so browser-based live inspection needs a local Playwright browser install first.
- Saved `Plans/Full Stabilization, Mobile Sizing, Performance And Growth Plan For The Site.md` and registered the plan in `Plans/Plan History.md` so the next stabilization/performance work has a single tracked reference.
- Added semantic contrast tokens in `styles/tokens.css` (`text-on-light`, `text-on-dark` and muted variants) to enforce the rule that light surfaces keep dark text and dark surfaces keep gold text.
- Tightened public mobile sizing in `styles/public.css`: smaller header logo/title proportions, denser `390px`/`640px` card spacing and less dominant first-fold hero content on phones.
- Applied the same contrast and mobile-sizing cleanup in `styles/workspace.css`, including smaller client/manager board spacing and more controlled heading sizes on narrow screens.
- Rebuilt `client-dashboard.html` around the shared workspace operations board, replacing the older hero/session top with `Project Status`, `Mail Box` and `Available Options`.
- Extended `client-dashboard.js` with lightweight project/mailbox overview rendering and thread-summary loaders so the client top board stays informative without forcing full message-history fetches at bootstrap.
- Updated `tests/playwright/mobile-smoke.spec.js` so mobile regression coverage checks the new client workspace top board and mailbox counters.
- Switched `tests/playwright/playwright.config.js` to Playwright-managed desktop Chromium instead of relying on a local Chrome channel, which is the better technology choice for reliable repeatable UI checks in this repo.
- Updated README and the cutover checklist so droplet deploy instructions restart through `ecosystem.config.js --update-env`, wait briefly after PM2 restart and validate via `/healthz`.
- Re-ran the available local validation entry points and confirmed the current blocker is environmental: both `npm run test:ci` and `npm run test:e2e:mobile` still fail locally with `spawn EPERM`, so the repo config is improved but the workstation runner still needs fixing.
- Adjusted the shared dark-surface text tokens in `styles/tokens.css` from pale gold toward a deeper dark-gold range so headings, nav and workspace text on black surfaces now match the premium direction more closely.
- Saved `Plans/Live QA, Asset Optimization And Richer Gold Tuning.md` and registered it in `Plans/Plan History.md` to track the runtime asset and live-QA pass explicitly.
- Added `scripts/asset-optimization.config.js` and `scripts/optimize-assets.js`, using `sharp` to generate repeatable AVIF/WebP/fallback variants for brand assets and the runtime `Gallery/premium` set.
- Updated `package.json` so `npm run optimize:assets` is a first-class task and `generate:public-pages` now rebuilds optimized runtime media before regenerating public HTML.
- Generated a tracked `asset-manifest.js` plus optimized brand assets under `assets/optimized/brand/` and runtime gallery assets under `Gallery/premium/` to replace missing/heavy runtime sources.
- Extended `runtime.js`, `brand.js`, `scripts/publicPages.shared.js`, `scripts/publicPageRenderer.js` and `gallery.js` so public/runtime media can resolve optimized variants and render through `<picture>` instead of a single heavy source.
- Updated the manual shell pages and generated-page renderer to load `asset-manifest.js`, use optimized brand images with intrinsic dimensions and point JSON-LD brand images at the optimized title asset.
- Updated `styles/base.css` and `styles/tokens.css` so picture-based media keeps existing layout geometry, dark surfaces use a richer premium gold, and the new asset sizes reduce first-fold pressure on mobile.
- Added AVIF to the tracked Nginx static asset regex so the deploy config can cache the new optimized image format directly when the site config is refreshed.
- Extended Playwright smoke/regression coverage to assert optimized brand pictures are present and that homepage/auth/dashboard shells keep zero horizontal scroll on mobile.
- Added `deploy/LIVE_QA_CHECKLIST_PC_MOBILE.md` as the repeatable desktop/phone verification checklist for post-deploy evidence capture.
- Removed the obsolete `RELEASE_NOTES_design-lock-v1.md` document and replaced it with `Project_Web_Design_Plan.md` so the repo now has a stable three-file loop: target design state, open issues and completed work.

## 2026-03-12

- Saved `Plans/Pelna Analiza Projektu I Plan Naprawy - Usprawnien.md` and registered it in `Plans/Plan History.md` so the stabilization/modularization wave has a tracked project plan.
- Added `test-results/` to `.gitignore` and stopped carrying `.last-run.json` as a tracked repo file, because it is a volatile Playwright artifact that kept dirtying the worktree after validation.
- Replaced the fragile `node --test` CLI usage in `package.json` with `scripts/run-api-v2-tests.js`, using `node:test` programmatic execution one file at a time to avoid the workstation `spawn EPERM` blocker without breaking per-file test isolation.
- Updated `scripts/run-playwright.js` to keep the external static server path but call the Playwright CLI programmatically without the broken `from: 'user'` argument handling.
- Verified that the remaining local Playwright blocker is environmental: Node cannot spawn worker processes or the Chromium executable on this workstation, so the failure is outside app logic.
- Moved duplicated overview/mailbox helpers (`titleCase`, `formatDateTime`, `createOverviewEntry`, `renderMailboxPreviewList`) into `runtime.js` and rewired both `client-dashboard.js` and `manager-dashboard.js` to consume the shared runtime helpers.
- Reduced `apps/mobile-v1/App.js` by extracting reusable mobile API/session loading helpers into `apps/mobile-v1/src/api.js` and `apps/mobile-v1/src/useApiList.js`, which improves parity with the web-side shared-client direction.
- Saved `Plans/Plan Naprawy Bledow Znalezionych Przez SonarQube.md` and linked it with `Project_todos.md` so SonarQube cleanup now has a tracked triage and execution path.
- Added `scripts/sonar-export.sh` as the repo-native Linux export path for SonarQube issues, quality gate and measures so the next cleanup pass can work from real issue data instead of inferred hotspots.
- Continued the Sonar/stability cleanup by splitting `routes/manager.js` so `staff/search/seed`, `services/materials` and `estimates` now register through dedicated subrouters under `routes/manager/` while quote/project/media endpoints stay in the main router.
- Reduced `apps/mobile-v1/App.js` further by extracting React Native screen components into `apps/mobile-v1/src/screens.js` and moving the shared mobile style sheet into `apps/mobile-v1/src/styles.js`, leaving the app shell focused on session and tab orchestration.
- Re-ran `npm run verify:generated` and `npm run test:ci` after the manager-route split and mobile-v1 screen/style extraction; both now pass with the refactor in place.
- Re-checked `npm run test:e2e:mobile` and confirmed the only remaining failure is still the workstation-level Playwright `spawn EPERM` blocker, not an application regression from this refactor.
- Rebuilt the homepage shell in `index.html` so it now starts with a three-part `header.png` board: left account panel, central artwork panel and right menu panel.
- Split the homepage flow into alternating light/dark bands in `styles/public.css`, matching the requested black/white background rhythm while keeping existing `projects`, `gallery`, `services`, `contact` and `quote` anchors intact.
- Updated homepage Playwright regression coverage in `tests/playwright/public-redesign.spec.js` and `tests/playwright/mobile-smoke.spec.js` so the tests validate the new board layout instead of the older `brand-title-link` header.
- Tuned the live proportions of the new homepage board in `styles/public.css`: smaller `header.png` height, a full dark top band and stronger balance between account, art and menu panels after the first production screenshot review.
- Saved `Plans/Redesign Publicznego Shellu Pod title.png.md` and registered it in `Plans/Plan History.md` before rolling out the new shared public shell.
- Replaced the temporary homepage-only `header.png` composition with a shared public shell built around a centered `title.png` board and a lower inline utility strip.
- Updated `scripts/publicPages.shared.js` so all public navigation now resolves in the fixed order `About Us | Gallery | Quote | Contact | Account`.
- Reworked `scripts/publicPageRenderer.js` so generated service, location and legal pages render the same `title.png` shell and no longer diverge from the manual pages.
- Replaced the manual public-page headers in `index.html`, `about.html`, `gallery.html`, `contact.html`, `quote.html`, `privacy.html`, `cookie-policy.html` and `terms.html` with the same shared shell markup.
- Extended `site.js` with a real inline public login/session strip that posts to the existing auth flow, stores session state and swaps to an account/session view when the user is already logged in.
- Added the shared shell styles to `styles/public.css`, including responsive handling for the centered `title.png` board, the inline login form and the right-aligned public nav.
- Regenerated the public service/location pages, then re-ran `npm run verify:generated` and `npm run test:ci`; both passed after the new shell rollout.
- Re-ran `npm run test:e2e:mobile` and confirmed the remaining failure is still the known workstation-level `spawn EPERM` issue rather than a regression from the new public shell.
- Tightened the shared public shell proportions in `styles/public.css` so `title.png` now sits in a slimmer top bar and the inline login/menu strip reads as a lower quick-access band instead of two oversized panels.
