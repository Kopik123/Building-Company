# Self-Hosted Fonts Migration

## Summary

- Scope: replace the remaining Google Fonts usage with locally hosted Montserrat and Cormorant Garamond assets across the current web app and generated public pages.
- Goal: remove third-party font requests and related CSP exceptions while keeping the current typography direction intact.
- Out of scope: changing the selected font families, redesigning typography, or adding new font weights beyond the ones already used in the UI.

## Key Changes

- Area 1: Local font assets
  - Add self-hosted `.woff2` files for the used Montserrat and Cormorant Garamond weights.
  - Add a shared `styles/fonts.css` with `@font-face` declarations.
- Area 2: HTML + generated pages
  - Replace remaining Google Fonts `<link>` tags with the local stylesheet reference.
  - Update `scripts/publicPageRenderer.js` so regenerated public pages keep using local fonts.
- Area 3: Security + validation
  - Tighten CSP in `app.js` so it no longer allows `fonts.googleapis.com` or `fonts.gstatic.com`.
  - Add a focused regression test that fails if external Google Fonts references return to the tracked pages/template.

## Public APIs / Interfaces

- Routes:
  - No API route contract changes.
- UI contracts:
  - Existing pages keep the same font families and weight mapping.
  - Generated public pages continue to share the same stylesheet order.
- Data contracts:
  - No data model changes.

## Test Plan

- Generation / build:
  - `npm run verify:generated`
- Automated tests:
  - `npm run test:api:v2`
  - `node --test /home/runner/work/Building-Company/Building-Company/tests/self-hosted-fonts.test.js`
- Manual checks:
  - Open a public page plus auth/dashboard pages and confirm typography still renders with local assets.
  - Confirm no browser request goes to `fonts.googleapis.com` or `fonts.gstatic.com`.
- Acceptance criteria:
  - No tracked page still links Google Fonts.
  - CSP no longer whitelists Google font origins.
  - Local fonts are served from `/assets/fonts/`.

## Assumptions

- The current Latin subset is enough for the present site content.
- The existing weight usage is limited to Montserrat 400/500/600/700 and Cormorant Garamond 500/600/700.
- Future Android/iOS work will consume typography tokens separately and does not depend on browser-hosted Google Fonts.
