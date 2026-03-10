# Project Todos

## Open

- [ ] Run `powershell -ExecutionPolicy Bypass -File .\scripts\setup-vscode.ps1` on the local machine that uses VS Code.
- [ ] Review whether `ms-vscode.live-server` is still needed if the project always runs through the app server and Playwright.

## Completed

- [x] Added a repeatable VS Code bootstrap script for extensions and workspace settings.
- [x] Added shared workspace extension recommendations in `.vscode/extensions.json`.
- [x] Merged project-wide VS Code defaults into `.vscode/settings.json` without removing existing SonarLint and chat tool settings.
