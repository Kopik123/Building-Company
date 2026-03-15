# Checklist Usprawnien Wolnego Lub Nieefektywnego Kodu

## Summary

- Scope:
  - `routes/manager.js`
  - `manager-dashboard.js`
  - `client-dashboard.js`
  - `gallery.js`
  - `apps/mobile-v1/App.js`
  - `site.js`
- Goal:
  - ograniczyc ciezkie zapytania, eager loading, pelne rerendery DOM i niepotrzebne polling loops
  - poprawic pierwszy render dashboardow i skalowanie list managera wraz ze wzrostem danych
  - utrzymac kontrakty gotowe pod przyszle Android/iOS bez framework rewrite
- Out of scope:
  - pelny rewrite frontendowy
  - migracja na WebSockety w tej fali
  - zmiana platformy DB/search engine w tej fali

## Key Changes

- Critical:
  - `routes/manager.js`
    - ustawic `/api/manager/projects` na domyslne `includeMedia=false`
    - dla listy projektow zwracac tylko `imageCount`, `documentCount` i opcjonalnie `coverMedia`
    - ograniczyc szerokie `q` na `LOWER(... LIKE %...%)` do najwazniejszych pol lub rozdzielic wyszukiwanie relacyjne od glownej listy
  - `client-dashboard.js`
    - usunac eager preload `ensureDirectThreadSummaries()` i `ensureThreadSummaries()` z bootstrapa
    - zostawic prawdziwy lazy load thread summaries i messages dopiero przy `onceVisible` lub otwarciu sekcji
    - jesli top board potrzebuje tylko counters, dodac lekki summary/count endpoint zamiast pobierac liste watkow
  - `manager-dashboard.js`
    - po seedzie nie przeladowywac zawsze `projects + services + materials`
    - odswiezac tylko dotkniete domeny lub oznaczac reszte jako `stale` do pozniejszego lazy reloadu

- Important:
  - `manager-dashboard.js` i `client-dashboard.js`
    - ograniczyc `innerHTML = ''` i przebudowywanie calego kontenera
    - przejsc na keyed updates dla `projects`, `threads`, `messages`, `quotes`, `services`
    - dla messages stosowac delta append/update zamiast full rerender
  - `gallery.js`
    - nie przebudowywac calego `stage` i `projectStrip` przy kazdej zmianie aktywnego projektu
    - utrzymywac stale nody i zmieniac tylko active state, caption i transforms
  - `apps/mobile-v1/App.js`
    - zastapic globalny `setInterval(1000)` schedulerem opartym o najblizszy `nextRunAt`
    - preferowac `on-focus` / `on-screen-visible` refresh dla lekkich danych

- Later:
  - `site.js`
    - dodac krotki TTL cache dla `/api/auth/me` na public pages, aby wspolny public shell nie walil stalego requestu na kazde wejscie
  - `styles/base.css`
    - dalej przenosic layout-specific rules do `styles/public.css` i `styles/workspace.css`, bo obecny plik nadal jest zbyt ciezki w maintainability
  - technologia pozniej:
    - jesli projekty i wyszukiwanie urosna, rozwazyc Postgres trigram/full-text search
    - jesli unread sync zacznie byc waskim gardlem, rozwazyc WebSocket/`socket.io`
    - dla mobile data fetching dlugofalowo lepszy bedzie `TanStack Query`, ale nie warto go wdrazac przed dalszym porzadkiem kontraktow API

## Public APIs / Interfaces

- Routes:
  - `/api/manager/projects`
    - zmienic domyslne `includeMedia` na `false`
    - utrzymac detail/media routes jako miejsce do pelnych danych mediow
  - `/api/client/overview`
    - rozwazyc osobny counts/summary shape dla top board zamiast eager thread summaries
- UI contracts:
  - dashboard sections maja ladowac dane dopiero przy widocznosci lub interakcji
  - listy powinny byc aktualizowane per-item, nie przez pelny rebuild calego kontenera
- Data contracts:
  - list DTO dla projektow powinien byc lzejszy niz detail DTO
  - thread/mailbox overview powinien miec wlasny lekki summary contract
  - mobile polling powinien miec jasno okreslone cadence per resource, nie globalny 1-second loop

## Test Plan

- Generation / build:
  - `npm run verify:generated`
- Automated tests:
  - `npm run test:ci`
  - `npm run test:e2e:mobile`
- Manual checks:
  - `/manager-dashboard.html`
  - `/client-dashboard.html`
  - gallery interaction na desktop i mobile
  - mobile-v1: login, projects, inbox/unread state
- Acceptance criteria:
  - manager list nie pobiera pelnych mediow domyslnie
  - client dashboard nie pobiera thread summaries na bootstrap bez potrzeby
  - po seedzie nie ma pelnego trojstronnego reloadu bez przyczyny
  - kluczowe listy dashboardow aktualizuja sie bez pelnego rerenderu
  - mobile-v1 nie budzi JS schedulerem co 1 sekunde bez realnej potrzeby

## Assumptions

- Najwieksze realne spowolnienia siedza dzis w manager/client dashboards oraz manager list/search API, nie w public static pages.
- Priorytetem tej fali jest redukcja kosztow runtime, nie zmiana frameworka.
- Produkcja jest obecnie stabilna; plan dotyczy optymalizacji wydajnosci i maintainability, nie naprawy deployu.
