# Project Todos

## Open

- [ ] Run `powershell -ExecutionPolicy Bypass -File .\scripts\setup-vscode.ps1` on the local machine that uses VS Code.
- [ ] Review whether `ms-vscode.live-server` is still needed if the project always runs through the app server and Playwright.
- [ ] Decide whether tracked `test-results` artifacts should remain versioned in the repository or be removed in a separate cleanup task.
- [ ] Plan a separate migration from `multer 1.x` to `multer 2.x`, because the dependency is still flagged in install warnings.
- [ ] Review whether the premium theme overrides now living in `styles/public.css` and `styles/workspace.css` should be split into smaller section-specific files after the visual direction stabilises.
- [ ] Keep every new feature review aligned with future Android/iOS app readiness, especially API contracts, auth/session handling, messaging and media flows.
- [ ] Re-check the new homepage header/account hierarchy on live desktop and mobile devices after deployment, because the account entry point moved out of the header and into the hero card.
- [ ] Implement the planned `client_proposal_quote` structure on the public quote page with phased UX, richer project fields and mobile-safe validation.
- [ ] Decide whether richer quote intake should be stored as structured quote metadata in phase 1 or temporarily mapped into the existing `description` field.
- [ ] After deploy, restart PM2 with `--update-env` once so the new explicit `HOST` binding is applied on the droplet.
- [ ] Re-check the new global `logo | title | account/nav` header proportions on live desktop and mobile, especially the title image width versus the account box width.
- [ ] Update the live Nginx site file only if it still points to `localhost` or `::1`; keep `127.0.0.1:3000` if the current upstream already matches the real listener.
- [ ] If exact chronology becomes important, replace the new derived `Company Events` overview in `manager-dashboard` with a persisted audit/event timeline instead of summarising current operational data.
- [ ] Resolve the local workstation `spawn EPERM` blocker so `npm run test:ci` and `npm run test:e2e:mobile` become reliable again.
- [ ] Install Playwright-managed browsers on the workstation after the config change, so browser QA no longer depends on a missing local `chrome.exe`.
- [ ] Split `manager-dashboard.js` into feature modules (`projects`, `quotes`, `services`, `materials`, `clients`, `staff`, `estimates`, `messages`) once the new overview shell settles.
- [ ] Split `client-dashboard.js` into feature modules (`overview`, `projects/documents`, `quotes/services`, `direct manager`, `project chat`) once the new top board settles.
- [ ] Move more responsive layout ownership out of `styles/base.css` into `styles/public.css` and `styles/workspace.css` after the current contrast/mobile pass is validated live.
- [ ] Run the new live QA checklist on desktop and a phone-sized viewport after the next droplet deploy, then capture screenshots for homepage, gallery interaction, dashboards and the quote/contact form.
- [ ] Revisit whether a CDN/media platform is worth introducing later if the runtime gallery set grows beyond the current `sharp` pipeline.

## Completed

- [x] Added a repeatable VS Code bootstrap script for extensions and workspace settings.
- [x] Added shared workspace extension recommendations in `.vscode/extensions.json`.
- [x] Merged project-wide VS Code defaults into `.vscode/settings.json` without removing existing SonarLint and chat tool settings.
- [x] Implemented the premium black / marble / dark-gold theme across public pages and workspace shells.
- [x] Added a consistent dark-gold line and window-frame motif to headers, cards, forms and footers.
- [x] Verified the premium shell regression with API tests, generated-page verification and Playwright coverage.
- [x] Recorded the standing rule that current web work must stay ready for future Android/iOS app rollout.
- [x] Moved the homepage account entry and public links from the header utility panel into the dedicated `Account` card.
- [x] Documented a professional `client_proposal_quote` plan for the quote page, manager triage and future Android/iOS portability.
- [x] Added explicit `HOST` binding so PM2 on Ubuntu and Docker environments use predictable listen addresses.
- [x] Unified the whole site around one shared header shell with `logo`, responsive `title.png`, and the right-side `Account / About Us / Gallery / Contact / Quote` block.
- [x] Added a simple `/healthz` endpoint so local and production process checks do not depend on full-page HTML responses.
- [x] Rebuilt the top of `manager-dashboard.html` into a three-part operational board with `Company Events`, `Mail Box` and `Available Options`.
- [x] Added lightweight manager mailbox summary loading plus overview rendering so the top dashboard shows real project/chat state without pulling full communication history on bootstrap.
- [x] Extended mobile Playwright coverage so the manager dashboard now asserts the new operational overview cards and mailbox counts.
- [x] Saved the full stabilization/mobile/performance plan in `Plans/Full Stabilization, Mobile Sizing, Performance And Growth Plan For The Site.md` and registered it in `Plans/Plan History.md`.
- [x] Added semantic `text-on-light` and `text-on-dark` theme tokens so the contrast rule can be enforced consistently.
- [x] Tightened mobile header, hero and workspace board sizing for `640px` and `390px` breakpoints.
- [x] Rebuilt the top of `client-dashboard.html` into `Project Status`, `Mail Box` and `Available Options`, matching the manager workspace shell.
- [x] Kept the client top board lightweight by loading direct/project thread summaries before full thread message histories.
- [x] Switched Playwright desktop coverage to managed Chromium instead of relying on a locally installed Chrome channel.
- [x] Updated deploy and cutover documentation to use `ecosystem.config.js --update-env`, `/healthz` and a short post-restart delay.
- [x] Shifted dark-surface typography tokens to a deeper dark-gold range so text on black surfaces reads as darker premium gold instead of pale gold.
- [x] Added a repeatable `sharp`-based asset pipeline that generates optimized brand and runtime gallery variants in AVIF, WebP and fallback formats.
- [x] Switched manual and generated public/workspace shell headers to `<picture>` markup backed by optimized brand assets with intrinsic dimensions.
- [x] Restored real runtime `Gallery/premium/*` files from generated outputs so public pages and gallery flows no longer reference missing alias files.
- [x] Updated gallery and generated public sections to read optimized media variants instead of a single heavy JPG/PNG path.
- [x] Tuned shared dark-surface gold tokens from bronze-leaning values toward a richer premium gold and aligned borders/accents with the new hue.
- [x] Added a dedicated live QA checklist for desktop and phone verification after deploy, including screenshot evidence requirements.
