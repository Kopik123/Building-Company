# Decyzja Docelowej Warstwy Web - web-v2 z Kontrolowanym Cutoverem

## Summary
- Goal: wybrac jedna docelowa warstwe authenticated web dla paneli klienta i managera oraz ograniczyc dalsze rozchodzenie sie `legacy` i `v2`.
- Scope: `client-dashboard.html`, `manager-dashboard.html`, `apps/web-v2`, `api/v2`, auth/session, routing runtime i plan cutoveru.
- Constraints: nie robimy twardego rewrite ani big-bang migracji; legacy zostaje aktywna warstwa kompatybilnosci do czasu osiagniecia feature parity i bezpiecznego rolloutu.

## Key Changes
- Decision: `apps/web-v2` staje sie docelowa authenticated web application dla dalszego rozwoju produktu.
- Decision: legacy `client-dashboard.html` i `manager-dashboard.html` nie beda dalej rozwijane jako docelowa platforma, tylko jako warstwa przejsciowa i kompatybilnosci podczas migracji.
- Reason: `web-v2` juz opiera sie na `api/v2` i refresh-token session model, co lepiej pasuje do przyszlego Android/iOS niz dalsze rozbudowywanie legacy page flows.
- Reason: `mobile-v1` juz konsumuje `/api/v2`, wiec wspolny kierunek `web-v2 + mobile-v1 + api/v2` zmniejszy koszt utrzymania i dryf kontraktow.
- Reason: legacy dashboardy sa dojrzale funkcjonalnie, ale pozostaja ciezko zwiazane z page-level DOM orchestration, co utrudnia wspoldzielenie logiki i dalsza modularnosc.
- Phase 1: wystawic `web-v2` jako kontrolowana powierzchnie rolloutowa, najlepiej pod osobna sciezka (`/app-v2` albo `/workspace-v2`) bez zastepowania legacy w pierwszym kroku.
- Phase 2: przeniesc auth/session ownership w web do jednego modelu `api/v2`, a legacy traktowac jako starsza warstwe do wygaszenia.
- Phase 3: migrowac krytyczne domeny w tej kolejnosci: `projects`, `quotes`, `messages`, `notifications`, `crm/inventory`, a potem tylko dopinac parity i live QA.
- Phase 4: po osiagnieciu parity, telemetry i stabilnym QA przelaczyc publiczne linki/account redirects na `web-v2`, a legacy zostawic jeszcze na 1-2 stabilne releasy jako fallback.

## Why This Direction
- `apps/web-v2` ma prostsza i bardziej przenoszalna architekture klienta niz legacy dashboardy, nawet jesli jest jeszcze funkcjonalnie chudszy.
- `api/v2` ma juz jawny kontrakt dla web i mobile, co jest lepszym fundamentem pod dalszy produkt niz utrzymywanie glownej logiki na `/api/*`.
- Przeniesienie kierunku na `web-v2` teraz jest tansze niz dalsze dopisywanie kolejnych duzych funkcji do legacy, a potem pozna migracja wszystkiego naraz.
- Lepsza technologia na ten etap to `TypeScript + shared contract package + OpenAPI lub Zod`, bo pozwoli rozwinac `web-v2` i `mobile-v1` bez recznego pilnowania zgodnosci struktur odpowiedzi.
- Nie warto teraz robic pelnego rewrite backendu ani zmiany frameworka web tylko po to, by “odswiezyc stack”; wieksza wartosc da kontrolowana konsolidacja wokol `api/v2`.

## Test Plan
- Current validation baseline before migration work: `npm.cmd run test:ci`, `npm.cmd run test:e2e:mobile`, `npm.cmd run build` w `apps/web-v2`.
- For Phase 1 rollout: dodac smoke test na route `web-v2` pod runtime Express.
- For cutover: utrzymac rownolegle testy legacy i `web-v2`, dopoki stare dashboardy nie zostana zdegradowane do fallback-only.

## Assumptions
- Legacy dashboardy pozostaja przez pewien czas online, ale nowe istotne funkcje nie powinny juz wzmacniac ich roli jako glownej aplikacji.
- `api/v2` pozostaje glownym kontraktem aplikacyjnym dla web/mobile.
- Cutover nastapi etapami, nie jednorazowo.
