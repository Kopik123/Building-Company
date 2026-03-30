# Analiza Projektu Building Company - Stan, Ryzyka I Kierunek

## Summary
- Goal: uchwycic aktualny stan techniczny repo, ryzyka architektoniczne i najwazniejsze decyzje potrzebne przed dalszym rozwojem.
- Scope: publiczny frontend, legacy dashboardy, `api/v2`, `apps/web-v2`, `apps/mobile-v1`, testy, migracje i tooling deployowy.
- Constraints: obecny web musi pozostac gotowy do dalszego rozwoju, a nowe decyzje powinny utrzymac przenoszalnosc pod przyszla aplikacje Android/iOS bez pelnego rewrite.

## Key Changes
- Potwierdzono aktualny model produktu: produkcyjny runtime opiera sie na `Express + statyczne HTML/JS/CSS + legacy /api/*`, a `api/v2`, `apps/web-v2` i `apps/mobile-v1` sa przygotowanym torem migracyjnym.
- Potwierdzono stan jakosci lokalnie na `2026-03-22`: `npm.cmd run test:ci`, `npm.cmd run test:e2e:mobile` oraz `npm.cmd run build` w `apps/web-v2` przechodza poprawnie.
- Zidentyfikowano glowny koszt utrzymania: rownolegle istnieja dwa webowe kontrakty auth/session (`ll_auth_*` w legacy oraz access/refresh tokens w v2), dwa style odpowiedzi API i dwa podejscia do frontendu.
- Zidentyfikowano glowna luke migracyjna: `apps/web-v2` buduje sie poprawnie, ale nie jest jeszcze realnie wpiety w runtime Express jako glowna powierzchnia produktu.
- Zidentyfikowano glowna luke mobilna: `apps/mobile-v1` korzysta z dobrego kierunku (`/api/v2`), ale ma twardy fallback do produkcyjnego URL, co utrudnia bezpieczny staging/dev.
- Rekomendowany kierunek teraz:
- utrzymac obecny backend `Express + Postgres` i nie robic rewrite backendu na tym etapie
- podjac jedna swiadoma decyzje o docelowej powierzchni web dla paneli (`legacy dashboards` albo realna migracja do `web-v2`)
- dodac wspolna warstwe kontraktow dla `api/v2`, web i mobile
- lepsza technologia na kolejny etap to `TypeScript + wspolny contract package + OpenAPI lub Zod`, bo ograniczy dryf kontraktow miedzy web/mobile/backend; warto wdrozyc teraz tylko wtedy, gdy kolejne sprinty beda dotyczyly glownie `v2/web/mobile`, a nie samego brochure SEO/design
- lepszy tooling repo na pozniejszy etap to `pnpm workspaces` lub `Turborepo`; dzis daloby lepsze zarzadzanie wieloma aplikacjami, ale nie jest krytyczne dopoki `web-v2` i `mobile-v1` nie stana sie aktywnymi, czesto rozwijanymi produktami

## Test Plan
- Automated: `npm.cmd run test:ci`
- Automated: `npm.cmd run test:e2e:mobile`
- Automated: `npm.cmd run build` w `apps/web-v2`
- Manual: brak dodatkowego live QA w tej analizie

## Assumptions
- Legacy public pages i legacy dashboardy pozostaja obecnie glowna, realnie dostarczana powierzchnia produktu.
- `api/v2` jest docelowym kontraktem dla nowych klientow web/mobile, nawet jesli legacy `/api/*` nadal musi pozostac kompatybilne.
- Przyszla aplikacja Android/iOS powinna reuse'owac logike sesji, projekty, wiadomosci, powiadomienia i quote flow przez wspolny kontrakt, nie przez osobne mobilne obejscia.
