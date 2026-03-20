# Project Todos

Active checklist only. Completed work history lives in `Project_Dev_plan.md`.

## Now

- [x] Swap the quote-page top and lower card rows so `Before you send + form` sits above `Quote + How to brief`, matching the requested layout while keeping `#quote-card` on the form section.
- [x] Fix the public-header regression where authenticated brochure pages could still show autofilled inline login inputs alongside session controls.
- [ ] Verify in DevTools on the live site that `HTML`, `CSS`, `JS` and image assets return `Cache-Control: no-store`, so normal refreshes pick up frontend changes without manual history clearing.
- [ ] Run one consolidated live QA pass on `/`, `/about.html`, `/services.html`, `/gallery.html`, `/quote.html`, `/contact.html`, `/auth.html`, both dashboards, two service pages and two location pages.
- [ ] In that QA pass, explicitly check: `mainbackground.png` inside cards, gold-text readability, desktop header proportions, mobile stacking, login/account/logout/session state and no horizontal scroll on phone breakpoints.
- [ ] In that same live QA pass, verify the background split stays consistent: `mainbackground.png` on cards/sections, `boxbackground.png` on fields and smaller input-style panels, with no leftover legacy dark fills covering the card background.
- [ ] On live `manager-dashboard.html`, verify the new manager flow starts with area choice (`Projects`, `Materials / Stock`, `Services`) and then exposes the right create/edit actions without leaving stale sections visible.
- [ ] On live `manager-dashboard.html`, verify the new private messenger flow can create a direct thread with a client and with a staff member from the new email-based composer.
- [ ] On live `manager-dashboard.html`, verify project chat creation works from the new form: pick a project, auto-seed the client/assigned staff, optionally add an extra participant, and confirm the thread opens selected after creation.
- [ ] On live `manager-dashboard.html`, verify project-chat participant management works end-to-end: current member list renders, admins can add/remove participants, and non-admin thread members do not see admin-only controls.
- [ ] On live both dashboards, verify direct thread cards and mailbox previews now show the latest-message preview plus unread state, and that opening a direct thread clears the unread indicator without a full page reload.
- [ ] On live both dashboards, verify direct and project chat now support attachments end-to-end: select a file, send it, confirm the message renders the attachment link, and confirm attachment-first direct conversation creation works when no private thread exists yet.
- [ ] Confirm on live `/gallery.html` that the gallery now reads fully service-led, with correct service descriptions, service rail labels and fullscreen image flow on desktop and mobile.
- [ ] Confirm on live `/gallery.html` that the side-preview images inside the gallery stage stay centered, scaled and readable on desktop instead of overlapping or clipping against the stage edges.
- [x] Collapse the gallery intro and side-preview stage earlier on narrower desktop/tablet widths so the page switches to one dominant image before the old three-card stage becomes cramped.
- [x] Stop the gallery intro cards from stretching into large dead dark surfaces by aligning the intro grid to content height instead of equal-height stretch.
- [x] Render gallery side-preview cards as real thumbnails (`cover`) while keeping the center image readable (`contain`), so desktop gallery previews feel more useful and less padded.
- [x] Keep the gallery center image on `contain` but switch visible side previews to `cover`, so wide-desktop side thumbnails feel like previews instead of padded black panels.
- [x] Align the gallery Playwright regression with the new service-switcher contract so it checks active service title/meta/status instead of the removed image-title node.
- [x] Sync the workspace/auth footer service fallbacks to the canonical five-service set so those pages no longer ship stale wall/flooring labels before `site.js` hydrates brand links.
- [x] Rename the manager quick-access/account-panel labels to `Create Project`, `ProjectManager`, `QuotesReview`, `ServicesManage`, `MaterialsTrack`, `Clients`, `Staff`, `Estimate`, `PrivateChat` and `ProjectChat`, and surface the same manager quick-access links inside the logged-in `auth.html` account panel.
- [x] Apply `boxbackground.png` to all field-style workspace panels (operations cards, overview entries, mailbox stats/columns, dashboard items and attachment rows) so the highlighted surfaces across manager/client cards consistently use the box background.
- [x] Remove the old `public-section` and workspace content-shell background bands that were still sitting behind brochure/workspace cards and visually obscuring the shared `mainbackground.png` card treatment.
- [x] Move the gallery `Service Rail / Gallery / active service meta` card above the `Service Gallery / How To Browse` intro cards so the interactive service rail leads the page before the explanatory copy.
- [x] Show a real manager `Account Panel / Quick Access` inside the public header after login, using the requested manager labels (`Create Project`, `ProjectManager`, `QuotesReview`, `ServicesManage`, `MaterialsTrack`, `Clients`, `Staff`, `Estimate`, `PrivateChat`, `ProjectChat`) and hiding the plain public `Account` link while that panel is visible.
- [x] Deduplicate the manager quick-access config so `brand.js`, `auth.js`, `site.js` and `manager-dashboard.shell.js` all read the same labels, hrefs and role rules from one shared source.
- [x] Keep manager-dashboard quick-access links as local `#section` anchors even after moving the shared quick-access config into `brand.js`, so public/auth pages can use full dashboard URLs without breaking in-dashboard quick-access navigation.
- [x] Centralise role labels and account destinations so `brand.js`, `auth.js`, `site.js`, `client-dashboard.shell.js` and `manager-dashboard.shell.js` all agree on role naming, redirect paths and manager-workspace permissions.
- [ ] Confirm on live `/services.html` that `Discuss wall systems` opens `/quote.html` with the wall-systems context already selected in the quote form.
- [ ] Capture fresh screenshot evidence for homepage, gallery, quote/contact forms, auth state and both dashboards after the consolidated live QA pass.
- [ ] Resolve the local PowerShell execution-policy issue blocking `npm.ps1`; until fixed, keep using `npm.cmd` for local validation commands.
- [ ] Standardise local shell snippets for Windows PowerShell 5.1 (`;` or `cmd /c`) because `&&` chaining is not supported in the current local shell.
- [x] Add HTML asset cache-busting so deploys emit versioned CSS/JS/image URLs without manually editing every brochure/dashboard HTML file.

## Next Engineering

- [x] Continue splitting `manager-dashboard.js` into feature modules: `messages` after the `projects`, `quotes`, `services`, `materials`, `clients`, `staff` and `estimates` domain extraction.
- [x] Trim `manager-dashboard.js` down to a thin orchestration shell now that `projects`, `quotes`, `services/materials`, `clients/staff`, `estimates` and `messages` all live in dedicated controllers.
- [x] Extract `overview` and `projects/documents` from `client-dashboard.js` into dedicated controllers and wire them through the shared client workspace shell.
- [x] Extract the remaining client communication domains (`direct manager`, `project chat`) into a dedicated messaging controller and wire them through the shared client workspace shell.
- [x] Extract `client-dashboard.shell.js` so bootstrap/session/logout leave `client-dashboard.js` as a thin orchestration shell around overview, projects and messaging controllers.
- [x] Move more responsive/layout ownership out of `styles/base.css` into `styles/public.css` and `styles/workspace.css`.
- [x] Split generated-page workflows into a light HTML-only path (`npm run generate:public-pages:content`) and a full asset+HTML path (`npm run generate:public-pages` / `generate:public-pages:full`) so routine brochure/content edits do not require a full asset optimisation pass.

## Product And Workflow

- [ ] Implement the planned `client_proposal_quote` structure on the public quote page with phased UX, richer project fields and mobile-safe validation.
- [ ] Decide whether richer quote intake should be stored as structured quote metadata in phase 1 or temporarily mapped into the existing `description` field.
- [ ] Define one explicit CRM lifecycle for clients: `lead`, `quoted`, `approved`, `active project`, `completed`, `archived`.
- [ ] Add a real project workflow model with `stage`, `milestone`, `task/work package`, `owner` and `due date`.
- [ ] Design and implement a durable activity/audit feed for company, client and project timelines.
- [ ] Close the operational gap in `quote -> estimate -> approval -> project` so estimate approvals are explicit, versioned and portable to mobile clients.
- [ ] Consolidate manual public pages and generated SEO pages onto one content model/source so brochure copy, metadata, FAQ and CTA logic stop drifting.
- [ ] Create a shared web/mobile contract layer for auth/session, project summaries, thread summaries, notifications and estimate state before expanding `mobile-v1` further.
- [ ] Keep every new feature review aligned with future Android/iOS app readiness, especially API contracts, auth/session handling, messaging and media flows.
- [ ] Decide whether group/project chat needs per-member unread tracking now that thread summaries already expose latest-message preview and message counts; current group-chat UX still has no unread badge model.

## Tooling And Quality

- [ ] Resolve the remaining local Playwright `spawn EPERM` issue and record the first green local `npm run test:e2e:mobile` pass.
- [x] Make `scripts/run-playwright.js` resilient to parallel local runs; today the static server binds fixed port `4173`, so concurrent Playwright commands can fail with `EADDRINUSE`.
- [x] Run a first Sonar cleanup pass across dashboard/browser modules and shared utils: replace `window` with `globalThis`, adopt `node:` imports, use `Object.hasOwn`, simplify direct optional checks and modernise a few low-risk helper patterns.
- [x] Continue the Sonar cleanup in `client-dashboard.messages.js` by extracting thread-open, lazy-load and submit helpers so the client mailbox flow keeps the same behavior with lower nesting and clearer direct-thread creation logic.
- [x] Continue the Sonar cleanup in `manager-dashboard.messages.js` by extracting thread-card render helpers, participant-management handlers and all message/thread submit flows while also hardening form submit behavior for mobile WebKit.
- [x] Continue the Sonar cleanup in `manager-dashboard.shell.js` by extracting workflow chooser, company-events, available-options, autocomplete, lazy-section and seed/bootstrap helpers so the shell keeps the same runtime behavior with lower nesting and cleaner orchestration.
- [x] Continue the Sonar cleanup in `gallery.js` by extracting curated-collection, status-text, roller-card and init/bootstrap helpers so the public gallery keeps the same UI while reducing nested callbacks and nested template text assembly.
- [x] Continue the Sonar cleanup in `manager-dashboard.catalog.js` by extracting shared catalog loaders, service/material card helpers, update/delete actions and paginated reload handlers so the manager catalog keeps the same behavior with lower nesting and less duplicated services/materials logic.
- [x] Continue the Sonar cleanup in `manager-dashboard.estimates.js` by extracting estimate-card, line-item, payload-validation and submit/delete helpers so the manager estimate flow keeps the same behavior with lower nesting and clearer create/update/line-item logic.
- [x] Continue the Sonar cleanup in `routes/group.js` by extracting validation, membership/admin guards and project-chat seed helpers so group-thread creation and membership flows keep the same API contract with lower cognitive complexity.
- [x] Continue the Sonar cleanup in `site.js` by extracting public auth-shell state helpers and dashboard accordion helpers, replacing `data-*` `setAttribute(...)` usage with `.dataset` where appropriate, and simplifying the inline auth state branching without changing public/account behavior.
- [x] Continue the Sonar cleanup in `tests/playwright/mobile-smoke.spec.js` by extracting shared route-method helpers, simplifying toggle helpers and removing noisy inline request-method branches without changing public/workspace smoke coverage.
- [x] Investigate why direct file targeting through `node scripts/run-playwright.js ... tests/playwright/public-redesign.spec.js` can still return `No tests found` on Windows, even though the same suite runs correctly through `--grep`.
- [x] Upgrade direct upload middleware from `multer 1.x` to `multer 2.x` and lock in a real multipart inbox-attachment regression so deploy logs stop flagging the known `multer 1.x` vulnerability while the existing upload API contract stays unchanged for future mobile clients.
- [ ] Continue dependency cleanup after the `multer` upgrade: the remaining production warnings/vulnerabilities now come mainly from `bcrypt -> @mapbox/node-pre-gyp -> tar/glob/rimraf/npmlog`, so decide whether to upgrade or replace `bcrypt` next.
- [ ] Export the real issue list from SonarQube for branch `vscode`, classify each `Bug` and `Vulnerability`, and start cleanup with `manager-dashboard.js`, `routes/manager.js`, `client-dashboard.js`, `styles/base.css` and `apps/mobile-v1/App.js`.
- [ ] Run `scripts/sonar-export.sh` with `SONAR_URL` and `SONAR_TOKEN`, then attach `sonar-issues-full.json`, `sonar-quality-gate.json` and `sonar-measures.json` to the Sonar cleanup workflow.
- [ ] Revisit SonarQube CPD exclusions once more public HTML moves into the shared renderer and fewer static outputs need to stay excluded.
- [ ] Continue the Sonar cleanup with the remaining higher-complexity smells in dashboard/gallery controllers (`nesting`, `cognitive complexity`, nested template literals) now that the portability/readability pass is done.
- [ ] Create a new current design source-of-truth markdown to replace the removed `Project_Web_Design_Plan.md`.

## Later

- [ ] Replace the current runtime query-param cache-busting plus `no-store` iteration mode with hashed asset filenames or manifest-driven immutable caching once the public shell/design iteration stabilises and performance caching matters more than instant refresh behavior.
- [ ] Fold the folder-based `Gallery/<service>/` image sets into the `sharp` asset pipeline so fullscreen and service-gallery views can use responsive AVIF/WebP variants instead of copied JPG-only source files.
- [ ] Revisit whether a CDN/media platform is worth introducing later if the runtime gallery/media set grows beyond the current `sharp` pipeline.
- [ ] If exact chronology becomes important, replace the derived `Company Events` overview in `manager-dashboard` with a persisted audit/event timeline.
- [ ] Decide later whether `header.png` should remain only as a historical/supporting asset now that `title.png` is the shared public shell lockup.
