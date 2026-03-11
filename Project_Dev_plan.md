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
