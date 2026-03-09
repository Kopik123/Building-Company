# Checklist

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
- [ ] todos_11: Rozwiazac glowny problem deployu: repo ma sledzone pliki z `node_modules`, wiec `npm ci` ponownie brudzi worktree i moze blokowac kolejne `git pull` na serwerze.
