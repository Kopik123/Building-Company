# Frontend Architecture And Public Shell Optimization Wave 1

## Summary
- Goal: rozpoczac calosciowa przebudowe frontendu od najszybszego i najbezpieczniejszego etapu, który poprawia wydajnosc publicznych stron, porzadkuje podzial assetów i odchudza wspólny runtime bez rozwalania obecnych flow quote/auth.
- Scope: public brochure shell, generated service/location pages, dashboard accordion bootstrap, generator publicznych stron, oraz runtime cache policy dla statycznych assetów.
- Constraints: zachowac obecne publiczne URL-e, nie wycinac jeszcze legacy dashboardów, nie lamac quote/gallery/auth flow i utrzymac Express jako runtime.

## Key Changes
- Split CSS per surface:
  - wyodrebniono `styles/gallery.css` dla gallery experience,
  - wyodrebniono `styles/quote-flow.css` dla phased quote intake i follow-up panelu,
  - `styles/public.css` zostalo odchudzone z glównych bloków gallery/quote,
  - brochure pages nie laduja juz `styles/workspace.css`.
- Public HTML cleanup:
  - `about`, `services`, `contact`, `privacy`, `terms`, `cookie-policy` laduja juz tylko brochure styles,
  - `index` i `quote` laduja `quote-flow.css`,
  - `gallery` laduje `gallery.css`,
  - generated service/location pages laduja `gallery.css` + `quote-flow.css` i nie laduja `workspace.css`.
- Generator cleanup:
  - `scripts/publicPageRenderer.js` renderuje stylesheet stack na podstawie surface capabilities zamiast doklejac `workspace.css` wszedzie.
- JS cleanup:
  - dashboard accordions zostaly wyniesione do osobnego `dashboard-accordions.js`,
  - `site.js` przestal nosic dashboard accordion bootstrap,
  - z `site.js` usunieto martwa logike `home motion`, `next-available-date` i `before/after` slidera, która nie miala juz odpowiadajacych elementów w HTML.
- Runtime/cache cleanup:
  - `app.js` utrzymuje `HTML -> no-store`,
  - `CSS/JS/fonts -> public, max-age=31536000, immutable`,
  - `Gallery/uploads -> no-store`,
  - pozostale statyczne obrazy maja lekkie cache z `stale-while-revalidate`.
- Regression coverage:
  - dodano `tests/api-v2/frontend-shell-optimization.test.js`,
  - zaktualizowano `tests/api-v2/app-legacy-routes.test.js` do nowej polityki cache.

## Test Plan
- Automated:
  - `npm.cmd run generate:public-pages:content`
  - `npm.cmd run verify:generated`
  - `node --test tests/api-v2/frontend-shell-optimization.test.js`
  - `npm.cmd run test:ci`
- Manual:
  - sprawdzic publiczne strony brochure pod katem braku regresji header/footer,
  - sprawdzic `gallery.html`, `quote.html` i homepage na mobile,
  - sprawdzic `client-dashboard.html` i `manager-dashboard.html` po dolozeniu `dashboard-accordions.js`.

## Assumptions
- To jest wave 1 calosciowej przebudowy, a nie pelny cutover do `apps/web-public`.
- `web-v2` pozostaje docelowa authenticated warstwa, ale w tej rundzie skupiamy sie na public shell i runtime efficiency.
- `/Gallery` i `/uploads` pozostaja bez agresywnego immutable cache, bo ich assety nie sa jeszcze w pelni content-addressed.
- Nastepne fale powinny objac rozbicie `apps/web-v2/src/App.jsx`, cienkie compatibility shells dla legacy dashboardów i dalsze uproszczenie public runtime.
