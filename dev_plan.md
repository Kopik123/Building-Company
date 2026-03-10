# Dev Plan

## Cel i zasady pracy

`dev_plan.md` jest glownym planem developerskim i pamiecia projektu. `todos.md` pozostaje skrocona checklista operacyjna.

Zasady stale:

- Przed zamknieciem kazdego zadania dopisujemy wykonane zmiany do sekcji `Historia wykonanych zmian`.
- Gdy zmienia sie status checklisty albo pojawia sie nowe ryzyko, rownolegle aktualizujemy `todos.md`.
- Historia w tym pliku jest append-only: nowe wpisy dopisujemy na koncu.
- Kazdy wpis historii zawiera date, tytul, zakres zmiany, efekt i status weryfikacji lub deployu, jesli dotyczy.
- Jesli zmiana nie wymaga nowego todo, i tak dopisujemy ja do historii w `dev_plan.md`.

## Aktualny stan projektu

Projekt jest monolitem Node.js / Express z publicznym frontendem serwowanym statycznie z root repo oraz z rosnacym podzialem na `api/v2`, `apps/web-v2` i `apps/mobile-v1`.

Aktualny stan funkcjonalny:

- Publiczne strony marketingowe sa oparte o generator stron z danymi w `scripts/*.data.js` i rendererem w `scripts/publicPageRenderer.js`.
- Homepage, strony uslug i strony lokalizacji zostaly jezykowo ujednolicone wokol jednej oferty: bathroom renovations, kitchens, tiling, carpentry, wall systems, flooring.
- Generator publicznych stron jest objety weryfikacja przez `npm run verify:generated`.
- Start serwera uruchamia migracje automatycznie przy bootowaniu aplikacji.
- Srodowisko produkcyjne to serwer Ubuntu na DigitalOcean.
- Na DigitalOcean deploy z 2026-03-09 przeszedl do aktualnego brancha `vscode`, ale ujawnil dwa kolejne blokery w migracjach produkcyjnych.

Aktualny stan roboczy i ryzyka techniczne:

- Naprawa kompatybilnosci migracji `quoteTable` zostala przygotowana i przetestowana.
- Naprawa detekcji brakujacych tabel dla `SessionRefreshTokens` / `DevicePushTokens` zostala przygotowana i przetestowana.
- Deploy na Ubuntu po hotfixach przeszedl przez migracje `202603080002-v2-session-device-and-email-hardening.js` oraz `202603090000-performance-search-trgm-indexes.js`, a aplikacja wystartowala poprawnie.
- Naprawa repo-level dla tracked `node_modules` zostala zacommitowana jako `724340f`, wdrozona na Ubuntu i potwierdzona komendami `git status` oraz `git ls-files node_modules`.

## Architektura i glowne obszary

### 1. Public website

- Statyczne pliki HTML/CSS/JS w root repo.
- Dane i generatory stron publicznych w `scripts/`.
- `brand.js`, `site.js`, `quote.js` obsluguja warstwe brandingu, interakcji i formularza.

### 2. Backend Express

- Gowna aplikacja HTTP jest skladana w `app.js`.
- Routing dzieli sie na legacy `/api/*` oraz nowe `/api/v2/*`.
- Aplikacja korzysta z `helmet`, CORS, rate limiting oraz obslugi statycznych plikow i uploadow.

### 3. API v2 / panele

- `api/v2` obejmuje auth, devices, crm, projects, quotes, messages, notifications, inventory i public endpoints.
- `apps/web-v2` to scaffold panelu React.
- `apps/mobile-v1` to scaffold aplikacji mobilnej.

### 4. Dane i migracje

- Sequelize + Umzug.
- Migracje uruchamiaja sie automatycznie przy starcie aplikacji.
- Modele obejmuja m.in. users, quotes, projects, media, notifications, service offerings, materials, session refresh tokens i device push tokens.

### 5. Testy i weryfikacja

- `npm run verify:generated` pilnuje zgodnosci wygenerowanych stron publicznych.
- `npm run test:api:v2` obejmuje lekki zestaw testow backendowych.
- `npm run test:ci` laczy verify generated z testami API v2.

## Otwarte zadania i ryzyka

### Priorytet produkcyjny

- Utrzymac nowy standard deployu na Ubuntu: po `git pull`, `npm ci` i `pm2 restart` zawsze sprawdzac `git status`, `git ls-files node_modules`, wynik migracji i finalny stan procesu.
- Rozwazyc oddzielenie migracji od startu aplikacji, bo obecny model nadal niesie ryzyko crash loop przy przyszlej nieudanej migracji.

### Ryzyka techniczne

- Automatyczne migracje przy starcie zwiekszaja ryzyko crash loop przy deployu, jesli jedna migracja jest niekompatybilna z wersja Sequelize lub stanem produkcyjnej bazy.
- Publiczne copy jest juz bardziej spojne, ale homepage nadal pozostaje mieszanka tresci trzymanych bezposrednio w HTML oraz w warstwie brandingu; dalsza centralizacja copy moze byc nadal potrzebna.
- Na serwerze nie wolno zakladac, ze status `online` w PM2 oznacza zdrowy start aplikacji; trzeba sprawdzac logi po migracjach.

### Zasada operacyjna na deploy

- Po deployu zawsze sprawdzamy `git rev-parse HEAD`, `git status`, `pm2 logs ...` i wynik migracji.
- Nie uruchamiamy slepo `npm audit fix --force` na produkcji.

## Historia wykonanych zmian

### 2026-03-09 - Ujednolicenie copy stron publicznych

- Zmieniono dane generatorow dla stron uslug i lokalizacji, aby korzystaly z jednego modelu oferty zgodnego z homepage.
- Skorygowano nienaturalne sklejanie tresci typu `full full ...`, poprawiono CTA oraz sekcje kontaktu.
- Wygenerowano ponownie publiczne HTML i zweryfikowano je przez `npm run verify:generated`.
- Status: zweryfikowane lokalnie.

### 2026-03-09 - Incydent deployu na DigitalOcean

- Pierwszy deploy brancha `vscode` nie doszedl do skutku, bo `git pull` blokowaly lokalne zmiany w `package-lock.json` oraz sledzonym `node_modules/.package-lock.json`.
- Po wymuszeniu synchronizacji branch produkcyjny doszedl do commit `3fddb1d69518fd03a3d83f220a7b528f0bcd13f6`.
- Incydent ujawnil, ze repo nie powinno sledzic plikow z `node_modules`, bo destabilizuje workflow deployowy.
- Status: incydent udokumentowany; glowna przyczyna workflow nadal otwarta.

### 2026-03-09 - Hotfix migracji `quoteTable`

- Naprawiono kompatybilnosc migracji `202603080001-production-baseline-hardening.js` i `202603090000-performance-search-trgm-indexes.js` dla Sequelize `6.35.2`.
- Zamiast zakladac dostepnosc `queryInterface.quoteTable(...)`, dodano fallback do `queryInterface.queryGenerator.quoteTable(...)`.
- Dodano test regresji dla obu migracji.
- Status: testy lokalne przeszly; deploy produkcyjny przeszedl dalej niz poprzednio.

### 2026-03-09 - Hotfix migracji brakujacych tabel sesji i push tokenow

- Zdiagnozowano, ze migracja `202603080002-v2-session-device-and-email-hardening.js` nie rozpoznawala komunikatu Sequelize `No description found for "... " table` jako braku tabeli.
- Rozszerzono detekcje `tableDoesNotExistPattern` i dodano test regresji, ktory symuluje ten przypadek.
- `npm run test:ci` przeszedl po zmianie.
- Status: gotowe do kolejnego deployu produkcyjnego.

### 2026-03-09 - Wdrozenie workflow `dev_plan.md`

- Dodano `dev_plan.md` jako glowna pamiec projektu i plan developerski.
- `todos.md` pozostawiono jako krotsza checkliste, ale z zasada stalego odsylania do `dev_plan.md`.
- Od tego momentu kazda wykonana zmiana ma byc dopisywana do historii w tym pliku oraz, gdy potrzeba, odnotowywana w `todos.md`.
- Status: workflow wdrozony w repo.

### 2026-03-09 - Doprecyzowanie srodowiska produkcyjnego

- Doprecyzowano, ze docelowe srodowisko serwerowe projektu to Ubuntu na DigitalOcean, a nie ogolny opis "Linux".
- To doprecyzowanie ma byc stosowane w dalszych instrukcjach deployowych i diagnostycznych.
- Status: zapisane jako stala informacja operacyjna.

### 2026-03-09 - Potwierdzenie skutecznego deployu po hotfixach migracji

- Na serwerze Ubuntu na DigitalOcean branch `vscode` zostal zaktualizowany do `b4b45dc`.
- Migracje `202603080002-v2-session-device-and-email-hardening.js` oraz `202603090000-performance-search-trgm-indexes.js` przeszly z wpisami `migrated`.
- `building-company` zakonczyl start komunikatem `Server running at http://localhost:3000`.
- Stare wpisy w `building-company-error.log` pozostaja historyczne; nie sa juz dowodem aktualnego crash loop po tym restarcie.
- Status: deploy potwierdzony jako udany; pozostawal otwarty tylko problem tracked `node_modules`.

### 2026-03-09 - Naprawa tracked `node_modules` w repo

- Usunieto `node_modules` z indeksu Gita przy zachowaniu katalogu lokalnie na dysku, zgodnie z istniejacym `.gitignore`.
- To jest wlasciwa naprawa zrodla problemu, przez ktory `npm ci` na Ubuntu brudzil worktree i blokowal kolejne `git pull`.
- Po zacommitowaniu i wdrozeniu tego commita serwer nie powinien juz wymagac `git restore node_modules/.package-lock.json node_modules/.bin/mime` przed kazdym deployem.
- Status: naprawa zacommitowana jako `724340f`; deploy na Ubuntu potwierdzil, ze `npm ci` nie brudzi juz worktree.

### 2026-03-09 - Potwierdzenie skutecznosci naprawy tracked `node_modules`

- Na Ubuntu branch `vscode` zostal zaktualizowany do commita `724340f` (`chore: stop tracking node_modules`).
- Po `npm ci --omit=dev` repo pozostalo czyste (`nothing to commit, working tree clean`).
- `git ls-files node_modules` zwrocilo `0`, co potwierdza, ze Git nie sledzi juz zadnego pliku z `node_modules`.
- `pm2 restart building-company` zakonczyl sie sukcesem, a proces pozostaje `online`.
- Status: glowny problem deployu z tracked `node_modules` zostal zamkniety operacyjnie.

### 2026-03-09 - Korekta copy karty kontaktowej na homepage

- Na homepage zmieniono etykiete karty z numerami telefonu z `Studio lines` na `Contact Numbers`.
- To porzadkuje nazewnictwo sekcji kontaktowej i lepiej komunikuje, ze chodzi o bezposrednie numery telefonu, a nie linie uslugowe.
- Status: poprawka wykonana lokalnie w `index.html`.

### 2026-03-09 - Ujednolicenie publicznego dostepu do konta

- Publiczne etykiety dostepu do konta zostaly uproszczone do jednego `Log In` zamiast rozdzielania wejscia na `Client Portal` i `Manager Dashboard`.
- Zmiana objela homepage, auth page, legal pages, runtime w `site.js` oraz generator nawigacji dla stron publicznych, ale nie zmienila samej logiki rolowych przekierowan po zalogowaniu.
- Status: poprawka wykonana lokalnie; wygenerowane strony publiczne zostaly odswiezone i zweryfikowane.

### 2026-03-09 - Poprawa kontrastu sekcji konsultacji i FAQ

- W `styles.css` przyciemniono teksty w sekcjach `Private Consultation` i `FAQ` na jasnym tle, aby lead, punkty konsultacji i pytania FAQ byly czytelne bez efektu zlewania z tlem.
- Dodatkowo zwiekszono nieco kontrast samych kart FAQ przez mocniejsze tlo i wyrazniejszy border.
- Status: poprawka wykonana lokalnie w warstwie CSS.

### 2026-03-09 - Przeniesienie sekcji `Direct Contact` pod `Coverage`

- Na homepage sekcja `Direct Contact` zostala przeniesiona bezposrednio pod `Coverage`, aby numery telefonu i email byly widoczne od razu po obszarach obslugi.
- Zmiana dotyczy jedynie ukladu sekcji na stronie glownej; tresc kontaktowa i logika formularzy pozostaly bez zmian.
- Status: poprawka wykonana lokalnie w `index.html`.

### 2026-03-09 - Przebudowa hero homepage i przesuniecie projektow wyzej

- Homepage hero zostal uproszczony do pelnoszerokiego ukladu z copy, CTA i statystykami bez bocznego formularza w sekcji startowej.
- Sekcja `Projects` zostala przesunieta bezposrednio pod hero, aby galeria case studies byla widoczna natychmiast po glownym komunikacie strony.
- Formularz kontaktowy pozostaje nizej w dedykowanej sekcji `Private Consultation`, wiec logika lead capture nie zostala usunieta, tylko odsunieta od topu strony.
- Status: poprawka wykonana lokalnie w `index.html` i `styles.css`.

### 2026-03-09 - Przyciemnienie copy w jasnych sekcjach uslug

- W `styles.css` przyciemniono teksty w blokach `intro-grid`, `feature-split`, `detail-card` i listach punktowanych na jasnym tle, tak aby copy czytalo sie w czerni / odcieniu obsidian zamiast zbyt lekkiego brazu.
- Zmiana obejmuje m.in. sekcje typu `A bathroom service built around detail control` oraz ich listy kontrolne.
- Status: poprawka wykonana lokalnie w warstwie CSS.

### 2026-03-09 - Uproszczenie hero `Client Portal`

- Z hero strony klienta usunieto boczny panel `Portal Overview`, aby sekcja otwierajaca nie konkurowala z glownym komunikatem i nie dublowala informacji kontaktowych.
- `Client Portal` zostal ustawiony jako pelnoszeroki blok, a chipy `Projects / Documents / Messages` pozostaly w jednym poziomym rzedzie.
- Status: poprawka wykonana lokalnie w `client-dashboard.html` i `styles.css`.

### 2026-03-09 - Uproszczenie headera `Client Portal`

- W headerze `client-dashboard.html` usunieto linki `Coverage` i `Client Portal`, zostawiajac krotszy uklad `Services / Projects / Gallery / Contact / Join Us`.
- `Contact` zostal ustawiony bezposrednio przed `Join Us`, a publiczne wejscie do logowania na tej stronie dostalo etykiete `Join Us`.
- Z tej strony usunieto osobny header CTA `Request Private Consultation`, a runtime w `site.js` przestal doklejac dodatkowy przycisk konta i drawer CTA, zeby nie powstawaly zduplikowane akcje w naglowku.
- Status: poprawka wykonana lokalnie w `client-dashboard.html` i `site.js`.
