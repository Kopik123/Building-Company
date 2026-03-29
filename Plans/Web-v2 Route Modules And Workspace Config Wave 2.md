# Web-v2 Route Modules And Workspace Config Wave 2

## Summary
- Goal: odchudzic `apps/web-v2/src/App.jsx` po pierwszej fali optymalizacji public shelli, tak aby zalogowana aplikacja przestala byc jednym 3700+ liniowym plikiem i dostala wspolny route config gotowy pod dalsze parity/cutover oraz przyszly Android/iOS mapping.
- Scope: `apps/web-v2/src/App.jsx`, nowy `workspace` kit, grouped page modules, shared route metadata i layout shell dla `/app-v2`.
- Constraints: nie zmieniac publicznych ani `/app-v2` URL-i, nie ruszac kontraktow `api/v2`, zachowac to samo zachowanie overview/projects/quotes/messages/notifications/crm/inventory i utrzymac compatibility z przyszlymi mobilnymi klientami.

## Key Changes
- Split workspace structure:
  - dodac `apps/web-v2/src/workspace/kit.jsx` jako wspolne source-of-truth dla kontraktowych enumow, helperow form/list/detail i wspoldzielonych komponentow UI,
  - dodac grouped route modules w `apps/web-v2/src/workspace/pages/` zamiast trzymac wszystkie strony w `App.jsx`,
  - dodac `apps/web-v2/src/workspace/routeConfig.jsx` jako wspolny `workspaceRouteDefinitions/workspaceNavItems` model.
- Make `App.jsx` thin again:
  - `App.jsx` ma zostac tylko routerem wejsciowym,
  - `workspace/layout.jsx` ma trzymac `LoginView`, `ProtectedRoute` i `WorkspaceLayout`,
  - side-nav ma czytac route metadata z configu zamiast duplikowac linki recznie.
- Keep mobile-ready contracts:
  - route metadata i wspolny kit maja byc neutralne wzgledem DOM-only flow,
  - enumy/helpery majace sens dla future mobile surfaces maja zostac w shared workspace layer zamiast byc zaszyte w jednym komponencie.
- Honest follow-up handling:
  - jesli po refaktorze build jest zielony, ale jeden rollout test dalej jest czerwony, zapisac to jawnie w `Project_todos.md` i nie udawac pelnej zieleni.

## Test Plan
- Automated
  - `npm.cmd run build` w `apps/web-v2`
  - `node scripts/run-playwright.js -c tests/playwright/playwright.config.js --grep "web-v2"`
  - `git diff --check`
- Manual
  - sprawdzic `/app-v2/overview`, `/app-v2/quotes`, `/app-v2/private-inbox`, `/app-v2/messages`, `/app-v2/inventory`
  - potwierdzic, ze sidebar i routing nadal zgadzaja sie z rola `client` vs `employee/manager/admin`

## Assumptions
- To jest wave 2 refaktoru authenticated app, nie finalne rozbicie wszystkich grouped page modules na najmniejsze domeny.
- `workspaceRouteDefinitions` ma byc przyszlym punktem styku dla web cutover i mobilnych shelli, ale nie zastepuje jeszcze pelnego generated route contract.
- Jezeli regresja Playwright dotyczy scenariusza quotes follow-up upload po module split, nalezy ja zapisac jako follow-up i dopiero osobno zdebugowac, zamiast mieszac to z samym route/config refaktorem.
