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
