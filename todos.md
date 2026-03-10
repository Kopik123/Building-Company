# Checklist

Uwaga operacyjna: `dev_plan.md` jest glownym planem i pamiecia projektu. `todos.md` jest skrocona checklista. Po kazdej wykonanej zmianie aktualizujemy `dev_plan.md`, a gdy zmienia sie status zadania lub ryzyka, rownolegle aktualizujemy tez `todos.md`.

- [x] todos_1: Przeanalizowac architekture repo, generatorow stron publicznych i stan niezacommitowanych zmian.
- [x] todos_2: Ujednolicic copy w `scripts/servicePages.data.js` z modelem oferty z homepage i stron lokalizacji.
- [x] todos_3: Usunac kolizje jezykowe po skladaniu fraz, w tym przypadki typu `full full ...`.
- [x] todos_4: Wygenerowac strony uslug i zweryfikowac spojnosc generatorow komenda `npm run verify:generated`.
- [x] todos_5: Spisac szczegolowa analize projektu website, ryzyka i nastepne kroki.
- [x] todos_6: Zapisac incydent DigitalOcean z 2026-03-09: pierwszy `git pull origin vscode` byl blokowany przez lokalne zmiany w `package-lock.json` i sledzonym `node_modules/.package-lock.json`.
- [x] todos_7: Zapisac wynik deployu na DigitalOcean: po wymuszeniu synchronizacji branch `vscode` doszedl do `3fddb1d69518fd03a3d83f220a7b528f0bcd13f6`.
- [x] todos_8: Zdiagnozowac crash loop po deployu: start aplikacji zatrzymuje migracja `202603080001-production-baseline-hardening.js` z bledem `queryInterface.quoteTable is not a function`.
- [x] todos_9: Naprawic lokalnie kompatybilnosc migracji `202603080001-production-baseline-hardening.js` i `202603090000-performance-search-trgm-indexes.js` dla Sequelize 6.35.2.
- [x] todos_10: Dodac test regresji dla migracji, zeby kolejne deploye lapaly brak `queryInterface.quoteTable` przed produkcja.
- [x] todos_11: Rozwiazac glowny problem deployu: repo ma sledzone pliki z `node_modules`, wiec `npm ci` ponownie brudzi worktree i moze blokowac kolejne `git pull` na serwerze.
- [x] todos_12: Zdiagnozowac drugi blocker deployu z 2026-03-09: migracja `202603080002-v2-session-device-and-email-hardening.js` nie traktowala komunikatu Sequelize `No description found ... table` jako braku tabeli.
- [x] todos_13: Naprawic detekcje brakujacych tabel w migracji `202603080002-v2-session-device-and-email-hardening.js` i dodac test regresji dla tego przypadku.
- [x] todos_14: Wdrozyc workflow `dev_plan.md` jako glowna pamiec projektu i dodac note operacyjna do `todos.md`.
- [x] todos_15: Potwierdzic udany deploy na Ubuntu po hotfixach migracji: `202603080002-v2-session-device-and-email-hardening.js` i `202603090000-performance-search-trgm-indexes.js` przeszly, a aplikacja wystartowala poprawnie.
- [x] todos_16: Wypchnac i wdrozyc commit usuwajacy tracked `node_modules`, a potem potwierdzic na Ubuntu, ze `npm ci` nie brudzi juz worktree i nie blokuje `git pull`.
- [x] todos_17: Skorygowac copy homepage, aby karta z numerami kontaktow uzywala etykiety `Contact Numbers` zamiast `Studio lines`.
- [x] todos_18: Ujednolicic publiczny entry point dostepu do konta do jednego `Log In` zamiast osobnych etykiet `Client Portal` i `Manager Dashboard`.
- [x] todos_19: Poprawic kontrast tekstu w sekcjach `Private Consultation` i `FAQ`, aby copy i pytania byly czytelne na jasnym tle.
- [x] todos_20: Przeniesc sekcje `Direct Contact` na homepage bezposrednio pod `Coverage`, aby numery i email byly widoczne wczesniej w ukladzie strony.
- [x] todos_21: Przebudowac homepage hero na pelnoszeroki, poziomy uklad i przeniesc sekcje projektow bezposrednio pod hero.
- [x] todos_22: Przyciemnic copy i listy w sekcjach uslug na jasnym tle, aby bloki typu `A bathroom service built around detail control` byly czytelne w czerni/obsidianie.
- [x] todos_23: Usunac panel `Portal Overview` z hero `Client Portal` i zostawic pelnoszeroki blok z poziomymi chipami `Projects / Documents / Messages`.
- [x] todos_24: Uproscic header `Client Portal`: usunac `Coverage` i `Client Portal`, przesunac `Contact` przed `Join Us`, oraz zlikwidowac duplikujace akcje naglowka.
- [x] todos_25: Domknac instrukcje z makiety `Client Portal`: podmienic tekst marki na `title.png`, zostawic `logo4.png`, usunac breadcrumbs i wymusic stale `Join Us` jako publiczny link logowania na tej stronie.
- [x] todos_26: Przebudowac caly front do wspolnego systemu `quiet architectural luxury`: `logo4.png + title.png`, wspolny shell nawigacji `Services / Projects / Gallery / Contact / Join Us`, spokojniejszy homepage dla klienta premium, cichszy shell workspace oraz odswiezony generator stron uslug i lokalizacji.
