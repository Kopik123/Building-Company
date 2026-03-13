# Pelna Analiza Projektu I Plan Naprawy / Usprawnien

## Summary

- Stan biezacy:
  - repo jest stabilne produkcyjnie
  - `/healthz` i `levellines.co.uk` odpowiadaja poprawnie
  - `verify:generated` przechodzi
  - lokalne `test:ci` musi byc odzyskane bez opierania sie na `node --test` workerach, bo te wpadaja w `spawn EPERM`
- Najwieksze hotspoty:
  - `styles/base.css`
  - `manager-dashboard.js`
  - `routes/manager.js`
  - `client-dashboard.js`
  - `apps/mobile-v1/App.js`
- Priorytet pierwszej fali:
  - stability first
  - web + `apps/mobile-v1`

## Key Changes

### 1. Fala 1: Stabilizacja i naprawa realnych bledow

- Naprawic lokalne srodowisko walidacji:
  - usunac blocker `spawn EPERM` dla lokalnego API test runnera
  - utrzymac Playwright na managed Chromium
  - zachowac `/healthz` jako jedyny health check deployu
- Przejsc po bledach funkcjonalnych w pierwszej kolejnosci:
  - auth/session restore
  - dashboard bootstrap
  - gallery interactions
  - quote/contact form flow
  - client/manager inbox loading

### 2. Fala 1: Refaktor wysokiego ryzyka technicznego

- Rozbic `manager-dashboard.js` na moduly:
  - overview
  - projects
  - quotes
  - services
  - materials
  - clients
  - staff
  - estimates
  - messages
- Rozbic `client-dashboard.js` na moduly:
  - overview
  - projects/documents
  - quotes/services
  - direct manager
  - project chat
- Wydzielic wspolne helpery:
  - auth/session
  - API client
  - status/error rendering
  - message/thread summaries
  - debounce/query helpers

### 3. Fala 1: Mobile UX i sizing

- Poprawic mobilny pierwszy ekran dla:
  - homepage
  - auth
  - client dashboard
  - manager dashboard
  - quote/contact
- Wymusic:
  - brak poziomego scrolla
  - zbalansowane proporcje `logo | title | account/nav`
  - wczesniejsze przejscie z 2 kolumn do 1 kolumny tam, gdzie poprawia czytelnosc
- Zachowac stala zasade kontrastu:
  - jasne tlo -> ciemny tekst
  - ciemne tlo -> gold tekst

### 4. Fala 1: `apps/mobile-v1`

- Traktowac `apps/mobile-v1` jako klienta przyszlego produktu bez pelnego rewrite w tej fali.
- Najpierw uporzadkowac:
  - wspolny kontrakt auth/API wzgledem web
  - wydzielenie request/session helpers z `App.js`
  - ograniczenie rozrostu jednego pliku `App.js`
  - spojnosc polling/loading states z web dashboardami

### 5. Fala 2 i dalej

- Zaplanowac migracje `multer 1.x -> 2.x`
- Wdrozyc `client_proposal_quote`
- Jesli potrzebna jest prawdziwa chronologia zdarzen, zastapic wyliczane `Company Events` trwalym audit/event feedem
- Dalej wzmacniac public IA i mobile polish po zamknieciu stabilizacji i modularizacji

## Public APIs / Interfaces

- W pierwszej fali bez zmian publicznych URL i bez zmian wymaganych kontraktow HTTP.
- Wewnetrznie wprowadzac wspolne kontrakty dla:
  - session/auth
  - lightweight dashboard summaries
  - messaging/thread summaries
  - wspolnego klienta API dla web i `apps/mobile-v1`

## Test Plan

- Po naprawie srodowiska:
  - `npm run verify:generated`
  - `npm run test:ci`
  - `npm run test:e2e:mobile`
- Manual QA web:
  - `/`
  - `/auth.html`
  - `/client-dashboard.html`
  - `/manager-dashboard.html`
  - jedna strona uslugi
  - jedna strona lokalizacyjna
- Manual QA `apps/mobile-v1`:
  - login
  - projects
  - quotes
  - inbox/threads
  - services
  - inventory

## Assumptions

- Produkcja jest stabilna i nie wymaga teraz zmian w Nginx/PM2.
- Fala 1 ma naprawiac przede wszystkim stabilnosc i strukture, a nie robic nowy redesign.
- `sharp` i optimized assets sa juz dobrym kierunkiem; wiekszy zysk teraz daje porzadkowanie logiki i testow niz zmiana frameworka.
- `Cloudinary/ImageKit` i wieksza przebudowa mobile sa opcjami pozniejszymi, nie oplacaja sie w tej pierwszej fali.
