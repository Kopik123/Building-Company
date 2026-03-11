# Full Stabilization, Mobile Sizing, Performance And Growth Plan For The Site

## Summary

- Scope: stabilize validation and deploy routines, improve mobile sizing, tighten frontend loading and keep the premium black / marble / dark-gold system consistent.
- Goal: make the current HTML-first web app more reliable, lighter and easier to extend toward future Android/iOS clients without a frontend rewrite.
- Out of scope: full SPA/framework migration, public API rewrite and a separate mobile web.

## Key Changes

- Stabilization:
  - standardize deploy checks on `ecosystem.config.js --update-env`, `sleep 2` and `/healthz`
  - switch Playwright desktop coverage to managed Chromium instead of relying on local Chrome
  - treat local `spawn EPERM` as an environment blocker until the workstation runner is fixed
- UI and mobile:
  - add semantic theme tokens for `text-on-light` and `text-on-dark`
  - reduce header/logo/title dominance on narrow widths
  - tighten homepage, public cards and workspace board padding at `640` and `390`
  - roll the manager-style top operations board into the client dashboard as `Project Status`, `Mail Box`, `Available Options`
- Performance and structure:
  - keep overview cards on lightweight summaries rather than full message histories
  - continue moving public/workspace layout responsibility out of `base.css`
  - keep heavier work queued for later: runtime image optimization, dashboard modularisation and structured quote metadata

## Public APIs / Interfaces

- No required public API changes in this phase.
- Internal UI contracts added/standardised:
  - shared semantic text tokens: `--ll-text-on-light`, `--ll-text-on-dark`
  - shared workspace overview shell for manager/client top boards
  - lightweight summary loading for top-level mailbox/status cards
- Recommended later:
  - structured `client_proposal_quote` metadata
  - persisted activity feed endpoint
  - optimized media delivery for WebP/AVIF variants

## Test Plan

- Automated:
  - `npm run test:ci`
  - `npm run test:e2e:mobile`
- Manual responsive checks:
  - homepage
  - quote
  - contact
  - service page
  - location page
  - auth
  - client dashboard
  - manager dashboard
- Acceptance:
  - no horizontal scroll at `390`, `640`, `768`, `992`, `1280`
  - balanced `logo | title | account/nav` header
  - readable top boards with no eager message overfetch
  - dark surfaces keep gold text, light surfaces keep dark text

## Assumptions

- Web remains multi-page HTML-first and responsive.
- Android/iOS readiness stays a standing architecture constraint.
- The highest-value performance improvement now is asset optimization plus better loading discipline, not a framework migration.
