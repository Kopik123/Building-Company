# Plan Naprawy Bledow Znalezionych Przez SonarQube

## Summary

- Scope:
  uporzadkowanie bledow i code smells raportowanych przez SonarQube / SonarLint dla web, backend routes i `apps/mobile-v1`.
- Goal:
  obnizyc liczbe issue typu `Bug`, `Vulnerability` i `Code Smell` bez zmiany publicznych kontraktow aplikacji i bez psucia aktualnego deployu.
- Out of scope:
  pelny redesign UI, zmiana frameworka frontendu, migracja do nowego stacku mobile.

## Key Changes

- Area 1:
  triage rzeczywistych issue Sonara wedlug ryzyka:
  `Bug` i `Vulnerability` najpierw, potem `Code Smell`.
  Kazde issue ma trafic do jednej z trzech kategorii:
  real fix, false positive, accepted tradeoff.
- Area 2:
  rozbic najwieksze hotspoty maintainability:
  `manager-dashboard.js`, `routes/manager.js`, `client-dashboard.js`, `styles/base.css`, `apps/mobile-v1/App.js`.
  Priorytet to zmniejszenie cognitive complexity, duplication i oversized files.
- Area 3:
  wydzielic wspolne helpery i serwisy, zeby Sonar nie wracal z tymi samymi problemami:
  auth/session, API wrapper, status-error UI, message-thread summary mapping, debounce-query helpers.
- Area 4:
  potraktowac dependency debt jako osobny strumien napraw:
  szczegolnie `multer 1.x -> 2.x`, ale bez `npm audit fix --force` w ciemno.
- Area 5:
  dopasowac proces pod przyszle Android/iOS:
  wspolne kontrakty API i session dla web i `apps/mobile-v1`, zamiast dalszego duplikowania logiki per klient.

## Public APIs / Interfaces

- Routes:
  brak zmian wymaganych publicznie w pierwszej fali napraw Sonara.
  Refaktory maja zostac wewnetrzne: cienkie handlery, wydzielone serwisy, wspolne helpery.
- UI contracts:
  brak zmiany flow uzytkownika.
  Dopuszczalne sa tylko naprawy stability, guards, lazy-loading i redukcja duplikacji.
- Data contracts:
  zachowac obecne `/api/v2`, ale porzadkowac shape helpers tak, zeby web i przyszly mobile app konsumowaly te same dane.

## Test Plan

- Generation / build:
  `npm run verify:generated`
- Automated tests:
  `npm run test:ci`
  `npm run test:e2e:mobile`
  po naprawie lokalnego `spawn EPERM` uruchamiac to jako gate po kazdym etapie krytycznych poprawek.
- Manual checks:
  `auth.html`, `client-dashboard.html`, `manager-dashboard.html`, homepage, jedna strona uslugi i jedna lokalizacja.
  Dla `apps/mobile-v1`: login, projects, quotes, inbox, inventory, services.
- Acceptance criteria:
  spadek liczby issue Sonara w `Bug` i `Vulnerability`,
  mniejsza complexity w najwiekszych plikach,
  brak regresji w deployu, health checku i glownej nawigacji,
  bardziej spojna warstwa API/session dla web i `apps/mobile-v1`.

## Assumptions

- Assumption 1:
  dokladna lista issue SonarQube nie jest teraz zalaczona do repo, wiec plan bazuje na realnych hotspotach kodu i obecnym SonarLint footprint.
- Assumption 2:
  najlepszym nastepnym krokiem technicznym bedzie eksport listy issue z SonarQube dla brancha `vscode`, bo to daje precyzyjniejszy plan `issue -> fix -> test` niz sama analiza kodu.
- Assumption 3:
  pierwsza fala ma naprawiac stabilnosc i maintainability, nie robic nowego redesignu ani przepisania stacku.
