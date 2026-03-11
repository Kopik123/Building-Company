# Premium Web Replan For Design, Performance And SEO

## Summary

- Scope:
  Public site IA, premium responsive shell, SEO structure, shared frontend runtime, dashboard bootstrap performance and static asset delivery.
- Goal:
  Keep the black / marble / gold identity while rebuilding the public experience around a premium brand-first structure that works cleanly on PC and mobile.
- Out of scope:
  `apps/web-v2`, `apps/mobile-v1`, public backend contract rewrites, multer 2.x migration in the same rollout.

## Key Changes

- Information architecture:
  Primary public navigation becomes `About Us | Gallery | Contact | Quote | Account`, with dedicated brand pages for `about`, `gallery`, `contact` and `quote`.
- Design system:
  Split CSS into `tokens`, `base`, `public` and `workspace`, preserve the Level Lines language of symmetry, linework, marble surfaces and gold detailing, and adapt the homepage to the new PC/mobile layout.
- Frontend and performance:
  Add shared runtime helpers, stop eager dashboard overfetch, lazy-load client/manager communication and secondary manager modules, and add static compression/cache policy in the Express app.
- SEO:
  Add brand pages to the crawl path, tighten titles/meta/canonical/JSON-LD, keep service/location pages indexed as secondary destinations and update `sitemap.xml`.

## Public APIs / Interfaces

- Routes:
  `/`, `/about.html`, `/gallery.html`, `/contact.html`, `/quote.html`, existing service/location/legal pages, unchanged dashboard URLs.
- UI contracts:
  Public header uses `logo.png` on the left, `title.png` centred, auth entry in the utility panel, and the same nav labels on all public/legal/workspace shells.
- Data contracts:
  Quote flow keeps the existing backend submit contract. Dashboard routes remain unchanged but load data lazily by section instead of eager bootstrap.

## Test Plan

- Generation / build:
  `npm run generate:public-pages`
  `npm run verify:generated`
- Automated tests:
  `npm run test:ci`
  `npm run test:e2e:mobile`
- Manual checks:
  Desktop homepage layout against the sketch, mobile scroll order `header/login/projects/gallery/services/contact/quote`, header logo/title proportions, brand pages and workspace shell.
- Acceptance criteria:
  No broken top-nav links, generated pages match the shared renderer, dashboards still function with lazy loading, and premium public pages remain indexable with updated SEO metadata.

## Assumptions

- The homepage remains the brand landing page, not a duplicate of About / Contact / Quote.
- `Account` stays session-aware and points to the correct dashboard when logged in.
- Package security cleanup is limited to low-risk dependency moves during this rollout; multer migration remains a tracked follow-up.
