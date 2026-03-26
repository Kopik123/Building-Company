# Windows PowerShell 5.1 Local Commands

This repo is often worked on from Windows PowerShell 5.1. That shell does not support Bash-style `&&` chaining, and on some machines `npm.ps1` can also be blocked by execution policy.

## Defaults

- Prefer `npm.cmd` instead of `npm` in local PowerShell 5.1.
- Prefer multi-line commands with an explicit `$LASTEXITCODE` check when later steps must stop on failure.
- Use `cmd /c "..."` only for short one-liners where Bash-style `&&` chaining is still convenient.
- Keep droplet deploy snippets as Bash; run those on the server, not in local PowerShell.

## Recommended fail-fast pattern

```powershell
npm.cmd run verify:generated
if ($LASTEXITCODE -ne 0) { exit 1 }

npm.cmd run test:ci
if ($LASTEXITCODE -ne 0) { exit 1 }
```

## Short one-line alternative

```powershell
cmd /c "npm run verify:generated && npm run test:ci"
```

## Common local commands

### Generated brochure HTML only

```powershell
npm.cmd run generate:public-pages:content
if ($LASTEXITCODE -ne 0) { exit 1 }

npm.cmd run verify:generated
if ($LASTEXITCODE -ne 0) { exit 1 }
```

### Full lightweight CI gate

```powershell
npm.cmd run test:ci
if ($LASTEXITCODE -ne 0) { exit 1 }
```

### Public Playwright suite

```powershell
node scripts/run-playwright.js -c tests/playwright/playwright.config.js tests/playwright/public-redesign.spec.js
if ($LASTEXITCODE -ne 0) { exit 1 }
```

### Mobile/workspace Playwright suite

```powershell
node scripts/run-playwright.js -c tests/playwright/playwright.config.js tests/playwright/mobile-smoke.spec.js
if ($LASTEXITCODE -ne 0) { exit 1 }
```

### API-only suite

```powershell
npm.cmd run test:api:v2
if ($LASTEXITCODE -ne 0) { exit 1 }
```

### Local migrations with CLI fallback

```powershell
$env:DEV_DATABASE_URL = "postgres://postgres:postgres@127.0.0.1:5432/building_company_dev"
npm.cmd run migrate:status
if ($LASTEXITCODE -ne 0) { exit 1 }
```

### Local migrations + explicit index sync

```powershell
$env:DEV_DATABASE_URL = "postgres://postgres:postgres@127.0.0.1:5432/building_company_dev"
npm.cmd run migrate
if ($LASTEXITCODE -ne 0) { exit 1 }

npm.cmd run ensure:indexes
if ($LASTEXITCODE -ne 0) { exit 1 }
```

## Note about better tooling

PowerShell 7+ supports `&&`, so upgrading the local shell would simplify day-to-day command chaining. It is a better long-term developer experience, but it is not worth blocking current work for this repo because the explicit PowerShell 5.1 patterns above are already stable.
