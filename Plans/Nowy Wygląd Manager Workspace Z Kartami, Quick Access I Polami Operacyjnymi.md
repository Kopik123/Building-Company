# Nowy Wygląd Manager Workspace Z Kartami, Quick Access I Polami Operacyjnymi

## Summary
- Przebudować `manager-dashboard.html` z długiej strony sekcyjnej do układu aplikacyjnego z kompaktowym headerem, lewym `Quick Access Rail` i jedną aktywną kartą roboczą po prawej.
- Zachować branding Level Lines, ale przełożyć go na operacyjny workspace: złote akcenty, `mainbackground.png` dla dużych shelli i `boxbackground.png` dla mniejszych pól/paneli.
- Uzupełnić brakujące pola operacyjne w domenach `Quotes`, `Services`, `Stock`, `Staff` oraz przepiąć routing na hash-based card navigation gotowy pod przyszłe mobile/native mapowanie.

## Key Changes
- Zastąpić dawny długi układ sekcyjny nowym shellem opartym o:
  - kompaktowy `app-header` z marką, globalnym wyszukiwaniem, statusem sesji i utility links,
  - lewy `Quick Access Rail` z 10 kartami domenowymi,
  - prawy obszar aktywnej karty z `context strip`, KPI i dwiema kolumnami roboczymi.
- Wprowadzić trwały routing kart przez hash:
  - `#overview`
  - `#projects`
  - `#quotes`
  - `#estimates`
  - `#inbox:private`
  - `#inbox:project`
  - `#website`
  - `#services`
  - `#stock`
  - `#crm`
  - `#staff`
- Utrzymać warstwę kompatybilności dla dawnych sekcji (`manager-projects-section`, `manager-quotes-section` itd.), ale renderować je już jako wnętrza aktywnej karty zamiast jednej długiej strony.
- Rozszerzyć pola robocze pod nowy workspace:
  - `Quote`: `nextActionAt`, `responseDeadline`, `lossReason`
  - `ServiceOffering`: `summaryLine`, `serviceCtaLabel`
  - `Material`: `reorderTargetQty`, `supplierContact`, `lastRestockedAt`
  - `User/Staff`: `jobTitle`, `specialism`, `availabilityStatus`
- Dodać nowe migracje:
  - `202603270005-manager-workspace-metadata-fields.js`
  - `202603270006-quote-workspace-follow-up-fields.js`
- Zaktualizować quick-access source-of-truth w `brand.js`, tak aby publiczny header, auth panel i manager workspace prowadziły do tych samych kart/hashy.
- Dostosować Playwright do nowego modelu kart, hash routing i quick-access rail zamiast starego przewijania po sekcjach.

## Test Plan
- Automated
  - `node --check manager-dashboard.shell.js`
  - `node --check manager-dashboard.js`
  - `node --check manager-dashboard.quotes.js`
  - `node --check routes/manager/quote-routes.js`
  - `node --check brand.js`
  - `node scripts/run-playwright.js -c tests/playwright/playwright.config.js --project=desktop-chromium tests/playwright/mobile-smoke.spec.js -g "manager dashboard"`
  - `npm.cmd run test:ci`
- Manual
  - Otworzyć `manager-dashboard.html` i sprawdzić domyślne wejście na `Overview`.
  - Przełączyć `Projects`, `Quotes`, `Inbox`, `Website`, `Stock`, `CRM` i `Staff` z `Quick Access Rail`.
  - Zweryfikować, że reload zachowuje aktywną kartę przez hash URL.
  - Sprawdzić mobile drawer/tabbar i brak poziomego scrolla.

## Assumptions
- Manager workspace ma wyglądać jak narzędzie operacyjne w marce Level Lines, nie jak kolejna brochure page.
- `Account` zostaje w utility/header layer, a nie jako jedna z 10 głównych kart manager dashboardu.
- Nowy shell ma być kompatybilny z obecnym web flow i jednocześnie mapowalny do przyszłego Android/iOS app shell.
