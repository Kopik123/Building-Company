# Project Dev Plan

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
