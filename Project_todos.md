# Project Todos

## Open

- [ ] Run `powershell -ExecutionPolicy Bypass -File .\scripts\setup-vscode.ps1` on the local machine that uses VS Code.
- [ ] Review whether `ms-vscode.live-server` is still needed if the project always runs through the app server and Playwright.
- [ ] Decide whether tracked `test-results` artifacts should remain versioned in the repository or be removed in a separate cleanup task.
- [ ] Plan a separate migration from `multer 1.x` to `multer 2.x`, because the dependency is still flagged in install warnings.
- [ ] Review whether the premium theme overrides now living in `styles/public.css` and `styles/workspace.css` should be split into smaller section-specific files after the visual direction stabilises.

## Completed

- [x] Added a repeatable VS Code bootstrap script for extensions and workspace settings.
- [x] Added shared workspace extension recommendations in `.vscode/extensions.json`.
- [x] Merged project-wide VS Code defaults into `.vscode/settings.json` without removing existing SonarLint and chat tool settings.
- [x] Implemented the premium black / marble / dark-gold theme across public pages and workspace shells.
- [x] Added a consistent dark-gold line and window-frame motif to headers, cards, forms and footers.
- [x] Verified the premium shell regression with API tests, generated-page verification and Playwright coverage.
