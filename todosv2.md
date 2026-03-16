# todosv2

## Summary

This file replaces the historical plan set that previously lived in `Plans/`.
It is now the single consolidated planning document for the project.

The project direction remains:

- one responsive web product for desktop and mobile browsers
- future Android/iOS support as a standing architectural requirement
- premium black / light-card / gold visual system
- quote-first public website
- protected client and manager workspaces
- reusable API and session flows that can later support native mobile clients

## Consolidated Source History

The following plans were merged into this document and can now be treated as historical input rather than separate sources of truth:

| Date | Time | Former Plan |
| --- | --- | --- |
| 2026-03-10 | 12:28:56 +00:00 | Responsive Rewrite For Site + HTML Dashboards |
| 2026-03-10 | 21:25:13 +00:00 | Premium Web Replan For Design, Performance And SEO |
| 2026-03-10 | 23:30:16 +00:00 | Premium Marble - Dark Gold Theme Replan |
| 2026-03-10 | 23:55:13 +00:00 | Professional Client Proposal Quote Form Plan |
| 2026-03-11 | 22:05:55 +00:00 | Full Stabilization, Mobile Sizing, Performance And Growth Plan For The Site |
| 2026-03-11 | 23:40:43 +00:00 | Live QA, Asset Optimization And Richer Gold Tuning |
| 2026-03-12 | 00:57:12 +00:00 | Pelna Analiza Projektu I Plan Naprawy - Usprawnien |
| 2026-03-12 | 17:55:58 +00:00 | Plan Naprawy Bledow Znalezionych Przez SonarQube |
| 2026-03-13 | 00:09:56 +00:00 | Redesign Publicznego Shellu Pod title.png |
| 2026-03-15 | 14:03:51 +00:00 | Checklist Usprawnien Wolnego Lub Nieefektywnego Kodu |
| 2026-03-15 | 19:51:43 +00:00 | Redesign Od Zera - Cala Strona, Design, IA I SEO |
| 2026-03-15 | 23:12:12 +00:00 | Pelna Analiza Projektu - Audit 360 + Roadmapa Rozwoju |
| 2026-03-16 | 00:41:00 +00:00 | Spojnosc Logiki Sesji, Headera I Nawigacji Na Calej Stronie |

## Current System Direction

### Product

- Public brochure site:
  - `Home`
  - `About`
  - `Services`
  - `Gallery`
  - `Quote`
  - `Contact`
  - legal pages
  - generated service/location pages
- Protected account area:
  - `auth.html`
  - `client-dashboard.html`
  - `manager-dashboard.html`
- Backend:
  - Express + Sequelize
  - reusable auth/session, quote, project, messaging and media flows
- Mobile:
  - `apps/mobile-v1`
  - must stay aligned with reusable contracts instead of page-only logic

### Design

- global background: black / dark
- content cards and panels: white / warm light / marble-like
- typography and accents: gold
- active design rule:
  - light background -> gold text
  - dark background -> gold text
- sticky shell:
  - `title.png` remains the shared public lockup
  - hamburger controls menu visibility
  - public header state changes with session state

### Session / Navigation

- guest:
  - sees login controls where appropriate
  - sees `Account` as route to `/auth.html`
- authenticated on public pages:
  - no guest-only login controls
  - sees `Account` routed to the correct dashboard
  - sees `Log out`
- authenticated on `auth.html` and workspace:
  - no duplicate header account entry
  - only account/settings and logout actions that make sense in context
- guest access to workspace routes:
  - redirect to `/auth.html?next=...&reason=session`
- wrong-role workspace access:
  - redirect to the correct dashboard

## Completed Foundation

These areas are already materially implemented and should be treated as the current baseline:

- premium shared visual system across public pages and workspaces
- shared `title.png` sticky public shell
- hamburger-based public menu
- session-aware account/login/logout behaviour
- `/healthz` endpoint and stable droplet deploy flow
- generated public service/location pages with shared shell
- optimized asset pipeline with `sharp`
- lighter manager project list/search path
- lazy client thread bootstrap
- reduced dashboard full rerenders
- lighter gallery interaction updates
- improved mobile polling scheduler
- partial route modularization under `routes/manager/`
- thinner `apps/mobile-v1/App.js`
- unified workspace/auth shell after login

## Open Work By Priority

### Critical Now

- Run live QA after deploy for:
  - `/`
  - `/about.html`
  - `/services.html`
  - `/gallery.html`
  - `/quote.html`
  - `/contact.html`
  - legal pages
  - at least two generated service/location pages
  - `/auth.html`
  - `/client-dashboard.html`
  - `/manager-dashboard.html`
- Verify live readability after the all-gold typography direction, especially on light cards and form surfaces.
- Re-check the shared `title.png` shell on desktop and mobile:
  - title width
  - hamburger spacing
  - account/nav balance
  - sticky header height
- Re-check public login/account/logout state for both guest and authenticated sessions.
- Re-run `npm run test:e2e:mobile` on a machine where Playwright workers/browsers can launch without `spawn EPERM`.
- Export the real SonarQube issue list for branch `vscode` and start fixing real bugs/vulnerabilities instead of inferred hotspots.

### Important Product Work

- Implement the planned `client_proposal_quote` structure on the public quote page.
- Decide whether richer quote intake data belongs in structured metadata now or temporarily inside `description`.
- Define one client CRM lifecycle used everywhere:
  - `lead`
  - `quoted`
  - `approved`
  - `active project`
  - `completed`
  - `archived`
- Add a real project workflow model:
  - `stage`
  - `milestone`
  - `task/work package`
  - `owner`
  - `due date`
- Build a durable activity/audit feed for company, client and project timelines.
- Close the operational gap:
  - `quote -> estimate -> approval -> project`

### Important Engineering Work

- Split `manager-dashboard.js` into domain modules:
  - overview
  - projects
  - quotes
  - services
  - materials
  - clients
  - staff
  - estimates
  - messages
- Split `client-dashboard.js` into feature modules:
  - overview
  - projects/documents
  - quotes/services
  - direct manager
  - project chat
- Move more responsive/layout ownership out of `styles/base.css` into:
  - `styles/public.css`
  - `styles/workspace.css`
- Consolidate manual public pages and generated SEO pages onto one shared content model.
- Create a shared web/mobile contract layer for:
  - auth/session
  - project summaries
  - thread summaries
  - notifications
  - estimate state

### Important Dependency / Tooling Work

- Plan and execute a separate `multer 1.x -> 2.x` migration.
- Review whether `ms-vscode.live-server` is still needed.
- Keep PM2 deploy usage aligned with `--update-env`.
- Narrow SonarQube CPD exclusions later once more public markup is truly shared at source level.

#### CSS split decision

- Current file sizes at review time:
  - `styles/base.css`: 4774 lines
  - `styles/public.css`: 1898 lines
  - `styles/workspace.css`: 418 lines
- Decision:
  - do not split `public.css` and `workspace.css` into smaller section files yet
  - keep focusing on moving responsibility out of `base.css` first
- Reason:
  - `base.css` remains the real maintainability hotspot
  - `public.css` and `workspace.css` are already the correct destination files
  - an extra split now would add moving parts before the live visual direction is fully settled

#### `multer 1.x -> 2.x` migration scope

- Current dependency:
  - `package.json` still pins `multer@^1.4.5-lts.1`
- Current central integration point:
  - [utils/upload.js](/d:/praca/website/Building-Company/utils/upload.js)
- Current route consumers:
  - [routes/client.js](/d:/praca/website/Building-Company/routes/client.js)
  - [routes/inbox.js](/d:/praca/website/Building-Company/routes/inbox.js)
  - [routes/group.js](/d:/praca/website/Building-Company/routes/group.js)
  - [routes/manager/project-routes.js](/d:/praca/website/Building-Company/routes/manager/project-routes.js)
- Recommended migration steps:
  - upgrade dependency in one isolated pass
  - adapt `utils/upload.js` first, not each route independently
  - re-check `diskStorage`, file filter and size limits against `multer 2.x`
  - regression-test all upload endpoints:
    - client project documents
    - direct inbox attachments
    - group/project chat attachments
    - manager project media upload
  - explicitly test:
    - allowed mime types
    - blocked file types
    - multi-file upload count limits
    - oversize file rejection
    - saved file paths and cleanup behaviour
- Worth doing now:
  - yes, as a small dependency-hardening pass
- Better technology later:
  - direct object-storage uploads could be better long-term if media volume grows
  - not worth replacing local upload flow yet before product workflow is more mature

### Later / Conditional Work

- Replace derived `Company Events` with a persisted audit timeline if chronology becomes important.
- Revisit CDN/media-platform adoption if runtime media growth outgrows the current `sharp` pipeline.
- Consider trigram/full-text search later if manager search grows beyond current project-scale needs.
- Consider WebSocket-based unread sync later if polling becomes a UX bottleneck.
- Consider stronger mobile data tooling later, but only after web/mobile contracts are cleaner.

## Live QA Checklist

### Public

- sticky `title.png` remains calm and readable on scroll
- hamburger menu opens/closes correctly
- no duplicate top-level nav blocks
- CTA path to `Quote` is clear
- gold typography remains readable on light cards
- no horizontal scroll at phone widths

### Account / Workspace

- guest sees only guest controls
- authenticated user sees only authenticated controls
- `Account` routes correctly by role
- `Log out` appears only when signed in
- wrong-role workspace access redirects correctly
- guest workspace access redirects correctly

### Dashboard Behaviour

- manager seed does not trigger unnecessary triple reloads
- gallery interaction updates smoothly without full rebuild flicker
- client/manager top boards do not overfetch message history at bootstrap

## Acceptance State

This consolidated plan is complete when:

- `todosv2.md` is the only planning document to follow
- `Project_todos.md` remains the operational checklist
- `Project_Dev_plan.md` remains the execution history
- the old `Plans/` plan files and plan-history file are removed
- future work updates these three root-level documents instead of recreating fragmented planning sources

## Recommended Execution Order

1. Live QA and deploy verification.
2. Quote intake redesign and structured quote decision.
3. CRM lifecycle and project workflow model.
4. Activity feed and explicit estimate-approval flow.
5. Dashboard modularization and CSS responsibility cleanup.
6. Web/mobile shared contract layer.
7. Sonar and dependency-hardening follow-up.
