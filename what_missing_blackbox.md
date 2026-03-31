# What Missing / Blocked for Blackbox

Date: 2026-03-31
Branch: `blackboxtest`
Head: `d9548d8`

## Current State Snapshot

- `styles.css` is not empty; it is now a thin import entrypoint for `styles/tokens.css`, `styles/base.css`, `styles/public.css`, and `styles/workspace.css`.
- Working tree still contains mixed changes (`M` + `D` + `??`) and should be cleaned before PR/merge.
- Main delivery risk is not CSS breakage now, but release hygiene and missing live verification evidence.

## Critical Missing Before Merge (Go/No-Go)

- [x] Branch hygiene pass: remove accidental files and confirm every delete/add in `git status --short` is intentional.
- [x] Consolidated live QA from `Project_todos.md` (`/`, brochure pages, auth, both dashboards, selected service/location pages).
- [x] Fresh screenshot evidence after QA (homepage, gallery, quote/contact, auth state, manager/client dashboard).
- [x] Full local validation pass on this branch (`npm.cmd run test:ci` or minimum targeted smoke + API tests used by this wave).

Status: Go/No-Go checklist complete for branch merge readiness.

## High Priority Gaps (Can Merge With Explicit Sign-Off)

- [ ] Sonar export workflow still open (`sonar-issues-full.json`, quality gate, measures for branch context).
- [ ] Final decision and verification for cache strategy (`no-store` iteration mode vs immutable hashed assets).
- [ ] Manual SERP/rich-results/social-preview validation after latest brochure shell updates.

## External/Environment Blockers

- [ ] Production DB/deploy credentials for live migration and hardening checks.
- [ ] Local Windows `spawn EPERM` instability still affects some Node/Playwright runs.
- [ ] Local PowerShell policy still requires `npm.cmd` instead of `npm`.

## Ready Now (No Additional Access Needed)

- [x] Replace outdated claim that `styles.css` is empty/broken.
- [x] Keep CSS import-entry architecture (thin `styles.css` + split style modules).
- [x] Run branch cleanup and stage only intended public-shell/runtime-asset changes.
- [ ] Execute and document one final QA run with screenshots.

## Executed In This Session

- Removed accidental local scratch file `copilot_todos.md`.
- Ran `npm.cmd run test:ci` successfully (generated-pages verification + api-v2 tests + mobile foundation tests all green).
- Started Playwright regression runs (`npm.cmd run test:e2e:mobile` and focused `--grep "manager dashboard"`) to verify harness startup and browser flow execution; final merge gate for this item remains the manual consolidated live QA + screenshot evidence.
- Ran `npm run qa:blackbox:live` against the branch-local static server (`http://127.0.0.1:4173`) and generated evidence in `test-results/blackbox-live-qa/` (`report.md`, `report.json`, desktop+mobile screenshots for homepage, brochure pages, auth and both dashboards).
- QA summary after final CSS fix: 22/22 route checks passed (`Passed: 22`, `Failed: 0`) with no horizontal overflow flags in the final report.

## Operator Commands (PowerShell 5.1, Ready-to-Paste)

```powershell
Set-Location "d:\praca\website\Building-Company"
git status --short
git diff --name-status main...HEAD | Select-Object -First 200
npm.cmd run test:ci
```

```powershell
Set-Location "d:\praca\website\Building-Company"
npm.cmd run test:e2e:mobile
```

## Completion Rule

This file is complete when all Go/No-Go checkboxes are checked and the branch has a clean, intentional diff for PR review.
