# Pelna Analiza Projektu - Audit 360 + Roadmapa Rozwoju

## Summary

- Projekt jest juz sensownym, dzialajacym systemem: ma publiczny quote-first website, panel klienta, panel managera, backend Express + Sequelize, generated SEO pages oraz zalazek aplikacji mobilnej `apps/mobile-v1`.
- Najwieksza wartosc jest juz zbudowana w domenie: `quotes`, `projects`, `project media`, `estimates`, `services/materials`, prywatny inbox 1:1, group/project chat, notifications i auth/session lifecycle.
- Najwieksze ryzyka nie sa dzis w samym deployu czy podstawowym API, tylko w:
  - duzych monolitach frontend/CSS (`styles/base.css`, `styles/public.css`, `manager-dashboard.js`, `client-dashboard.js`)
  - niepelnej warstwie operacyjnej produktu (`quote -> estimate -> approval -> project`, CRM, audit/activity feed, project stages/tasks)
  - rosnacej niespojnosci miedzy recznie utrzymywanymi public pages a generated service/location pages
  - niedomknietej przenaszalnosci web <-> mobile-v1
- Stan walidacji na dzien audytu:
  - `npm run verify:generated` -> pass
  - `npm run test:ci` -> pass
  - `npm run test:e2e:mobile` -> nadal zablokowane lokalnie przez znany workstation-level `spawn EPERM`
- Rekomendacja strategiczna:
  - nie robic rewrite frameworkowego teraz
  - najpierw domknac model produktu, modularnosc i kontrakty
  - rownolegle trzymac wszystko gotowe pod przyszly Android/iOS app client

## Key Changes

### 1. Current-State Audit

- Architektura runtime:
  - `app.js` sklada aplikacje Express z `helmet`, `cors`, `compression`, rate-limitami, statycznym serwowaniem i `/healthz`
  - backend dziala jednoczesnie na warstwie legacy i `api/v2`, co jest dobre dla kompatybilnosci, ale zwieksza koszt utrzymania
  - dane i relacje sa sensownie zebrane w `models/index.js`, z centralnym `ensureIndexes()` jako mocnym punktem projektu
- Glowne domeny danych sa juz dobrze obecne:
  - `User`, `Quote`, `Project`, `ProjectMedia`, `Estimate`, `EstimateLine`, `InboxThread`, `InboxMessage`, `GroupThread`, `GroupMessage`, `Notification`, `ServiceOffering`, `Material`, `SessionRefreshToken`, `DevicePushToken`
- Aktualny model produktu:
  - publiczny uzytkownik moze zlozyc guest quote
  - uzytkownik zalogowany ma account/session flow
  - manager moze obslugiwac quotes, projects, services, materials, estimates, komunikacje
  - client ma visibility na swoje projekty, quotes i komunikacje
- Mocne strony obecnego stanu:
  - centralny health check i stabilny deploy flow
  - generowane public pages z `verify:generated`
  - sensowne indeksy DB dla glownej domeny
  - asset pipeline `sharp`
  - sensowne testy API v2
- Glowny problem architektoniczny:
  - produkt jest juz bogatszy domenowo niz jego obecna struktura UI i JS; logika biznesowa rosnie szybciej niz modularnosc frontendu

### 2. Public Web / UX / Design / SEO Audit

- Aktualny publiczny web ma juz dobry kierunek:
  - sticky shell z `title.png`
  - quote-first IA
  - dark shell / light cards / gold brand language
  - `Home`, `About`, `Services`, `Gallery`, `Quote`, `Contact` + legal + generated service/location pages
- Co jest dobre i warto zachowac:
  - wspolny sticky shell dla public pages
  - generated service/location pages jako baza pod SEO scale bez recznego kopiowania wszystkiego
  - wyrazny CTA path do `Quote`
  - oddzielenie public brochure od workspace
- Co wymaga poprawy:
  - nadal istnieje duza ilosc podobnego markup/content miedzy recznymi public pages a generated pages
  - sticky shell laczy brand, login i menu, ale wymaga dalszego uproszczenia i live QA, zeby nie przeciazac first fold
  - obecne zalozenie "wszystkie napisy zlote" jest spójne brandowo, ale stwarza realne ryzyko czytelnosci i accesibility na jasnych kartach; jesli zostaje, trzeba pilnowac ciemniejszego premium-gold i kontrastu, a nie jaskrawego zlota
  - publiczne strony sa nadal mieszanka recznie skladanych sekcji i generatora, zamiast jednego czystego content modelu
- SEO:
  - plusy:
    - sitemap istnieje
    - canonical / meta / breadcrumb JSON-LD sa obecne na wielu stronach
    - generated pages maja sensowny model hub -> service/location
  - ryzyka:
    - manual pages i generated pages nie sa jeszcze oparte o jeden content manifest
    - thin/duplicate content risk pozostaje na service/location pages, jesli copy i FAQ nie beda dalej roznicowane
    - SEO jest stabilne technicznie, ale redakcyjnie jeszcze nie jest "decision complete"
- Rekomendacja:
  - nie budowac nowych thin pages
  - przejsc docelowo na jeden content model dla manual + generated public pages
  - utrzymac `Services` jako hub i wymusic przez generator: unikalny H1, lead, CTA, FAQ, lokalny/uslugowy kontekst

### 3. Product / Operations Audit

- Produkt ma juz fundament operacyjny ponad typowa strone firmowa:
  - guest quote intake
  - manager assignment
  - projects + media
  - estimates
  - inbox 1:1
  - group/project chat
  - notifications
  - services/materials catalog
- To jest duza przewaga projektu i warto to rozwijac, a nie upraszczac do zwyklej brochure site.
- Najwieksze luki biznesowe:
  - brak trwalego activity/audit feed dla firmy, klienta i projektu
  - brak modelu `stage / milestone / task / owner / due date` dla projektow
  - brak domknietego przeplywu `quote -> estimate -> approval -> project`
  - brak pelnego CRM status modelu klienta (`lead`, `quoted`, `approved`, `active project`, `completed`, `archived`)
  - brak czytelnego modelu staff allocation / obciazenia per projekt
- Co jest MVP i zostaje:
  - quote capture
  - basic project visibility
  - manager/client messaging
  - inventory/service management
- Co nie jest jeszcze produktem operacyjnym "na firme" i wymaga kolejnej fali:
  - timeline zdarzen
  - workflow delivery
  - explicit approvals
  - CRM lifecycle
- Rekomendacja:
  - traktowac `Estimate` jako centralny dokument handlowo-operacyjny
  - zbudowac wokol niego wersjonowanie i approval state
  - dopiero potem rozbudowywac finanse lub automatyzacje

### 4. Engineering / Performance / Maintainability Audit

- Hotspoty repo na dzien audytu:
  - `styles/base.css` ~4774 linii
  - `manager-dashboard.js` ~2043 linii
  - `styles/public.css` ~1898 linii
  - `routes/manager.js` ~1024 linii
  - `client-dashboard.js` ~778 linii
  - `site.js` ~636 linii
  - `scripts/publicPageRenderer.js` ~592 linii
  - `gallery.js` ~561 linii
- Co jest juz sensownie zrobione:
  - odchudzone manager project list/search
  - lazy thread loading w kliencie
  - keyed DOM sync w ciezszych dashboard lists
  - gallery bez pelnego rebuildu stage/projectStrip
  - mobile polling scheduler poprawiony
  - cache TTL dla `/api/auth/me`
- Co nadal boli:
  - `manager-dashboard.js` i `client-dashboard.js` sa nadal zbyt duze i odpowiedzialne za zbyt wiele sekcji
  - `routes/manager.js` wciaz laczy za duzo domen operacyjnych w jednym miejscu
  - `styles/base.css` pozostaje historycznym monolitem mimo przenoszenia odpowiedzialnosci do `styles/public.css` i `styles/workspace.css`
  - `styles/public.css` zaczyna rosnac w drugi monolit, bo przejmuje coraz wiecej odpowiedzialnosci za public redesign
  - `apps/mobile-v1/App.js` zostal odchudzony, ale mobile architektura wciaz nie jest rownorzednym klientem wobec web
- Testability:
  - `verify:generated` i `test:ci` daja sensowny lekki gate
  - najwieksza luka to brak lokalnie dzialajacego e2e mobile/browser validation przez `spawn EPERM`
- Dependency debt:
  - `multer 1.x` pozostaje aktywnym punktem do migracji
- Better tech / tradeoffs:
  - dla mobile dalszy wzrost lepiej obsluzylby `Expo Router + TanStack Query`, ale nie warto tego wdrazac przed ustabilizowaniem kontraktow danych
  - dla search na duzej skali lepszy bedzie indexed search / trigram / full-text, ale nie jest to pierwszy priorytet przy obecnym rozmiarze produktu
  - dla public content dlugoterminowo lepszy bedzie content manifest albo lekki CMS; na teraz wystarczy uporzadkowany shared renderer

### 5. Issue Register And Roadmap

#### Critical (teraz)

- Rozbic `manager-dashboard.js` na feature modules:
  - `overview`
  - `projects`
  - `quotes`
  - `services`
  - `materials`
  - `clients`
  - `staff`
  - `estimates`
  - `messages`
- Rozbic `client-dashboard.js` na mniejsze moduly:
  - `overview`
  - `projects/documents`
  - `quotes/services`
  - `direct manager`
  - `project chat`
- Kontynuowac rozbijanie `routes/manager.js` na domenowe subroutery i cienkie handlery
- Rozwiazac workstation blocker `spawn EPERM`, bo bez tego brak wiarygodnego lokalnego browser/mobile gate
- Zdefiniowac jednoznaczny CRM + project workflow model:
  - client statusy
  - project stages
  - estimate approval states

#### Important (nastepna fala)

- Dodac trwaly `activity feed` / audit log dla firmy, klienta i projektu
- Domknac przeplyw `quote -> estimate -> approval -> project`
- Wydzielic wspolny contract layer web/mobile dla:
  - auth/session
  - project summaries
  - thread summaries
  - notifications
  - estimate state
- Przeniesc wiecej odpowiedzialnosci layoutu z `styles/base.css` do wyspecjalizowanych plikow bez przeksztalcania `styles/public.css` w drugi monolit
- Uporzadkowac public content model tak, aby manual pages i generated pages korzystaly z jednego zrodla prawdy

#### Later (pozniej)

- Rozwazyc `Expo Router + TanStack Query` dla mobile-v1
- Rozwazyc websockety / push-first unread sync zamiast dalszego polegania na polling
- Rozwazyc search indexing / Postgres trigram/full-text dla bardziej zaawansowanego CRM/project search
- Rozwazyc lekki CMS lub content manifest tooling, jesli public content/SEO bedzie rosnac dalej
- Zaplanowac osobna migracje `multer 1.x -> 2.x` wraz z upload regression testami

## Public APIs / Interfaces

- Audit nie zmienia publicznych API, ale wskazuje newralgiczne kontrakty, ktore trzeba utrzymac lub uporzadkowac:
  - auth/session:
    - `/api/auth/*`
    - `/api/v2/auth/*`
  - quotes:
    - guest quote
    - claim request / confirm
    - manager quote handling
  - manager project list/detail/media:
    - `/api/manager/projects`
    - project media upload/detail
  - messaging:
    - `/api/inbox/*`
    - `/api/group/*`
    - `/api/v2/messages/*`
  - public content:
    - generated service/location page data model
    - gallery/public routes
- Docelowo wspolne web/mobile kontrakty powinny objac:
  - auth/session payloads
  - project summaries
  - thread summary shapes
  - notification payloads
  - estimate lifecycle state
  - client/project activity feed events

## Test Plan

- Baseline wykonany w ramach audytu:
  - `npm run verify:generated` -> pass
  - `npm run test:ci` -> pass
- Manual audit / review scenarios do dalszej walidacji po deployach:
  - `/`
  - `/about.html`
  - `/services.html`
  - `/gallery.html`
  - `/quote.html`
  - `/contact.html`
  - `/auth.html`
  - `/client-dashboard.html`
  - `/manager-dashboard.html`
  - min. 2 service pages
  - min. 2 location pages
- Kryteria akceptacji dla kolejnej fali po tym audycie:
  - brak duzych monolitow JS/CSS bez planu rozbicia
  - domkniety workflow `quote -> estimate -> approval -> project`
  - jednolity public content model dla manual + generated pages
  - web i mobile korzystaja z bardziej spojnych kontraktow
  - lokalny browser/mobile gate wraca do dzialajacego stanu

## Assumptions

- Projekt ma byc rozwijany jako profesjonalny system quote-first + operations, a nie tylko statyczna strona firmowa.
- Android/iOS readiness pozostaje stalym wymaganiem architektonicznym.
- Nie robimy teraz framework rewrite; najwiekszy zwrot da modularnosc, workflow i uporzadkowanie kontraktow.
- W tej fali audit ma byc dokumentem diagnostycznym i wykonawczym, nie automatycznym wdrozeniem wszystkich rekomendacji.
- Kolorystyka public site pozostaje black / light panels / gold, ale czytelnosc i kontrast musza byc pilnowane podczas dalszego live QA.
