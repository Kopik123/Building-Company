# Spójność Logiki Sesji, Headera I Nawigacji Na Całej Stronie

## Summary

Obecnie strona jest wizualnie bliżej jednego systemu, ale logika stanu użytkownika nadal była niespójna. Ten sam zalogowany użytkownik mógł widzieć równocześnie kilka różnych wejść do tego samego miejsca: `Login`, `Open Account`, `Account`, `Auth Page`, `Logout`.

Ta iteracja domyka ten obszar bez zmiany backend API. Celem jest jeden spójny model zachowania:

- gość widzi tylko wejścia dla gościa
- zalogowany widzi tylko wejścia dla zalogowanego
- dashboardy i `auth.html` nie pokazują już guest controls ani zdublowanych account/logout controls
- routing zależny od roli pozostaje jeden i centralny

## Key Changes

### 1. Jeden model stanu sesji dla całego frontendu

- w `site.js` wprowadzamy wspólny model stanów:
  - `guest`
  - `authenticated-public`
  - `authenticated-auth-page`
  - `authenticated-workspace`
  - `unauthorized-workspace`
- `site.js` staje się jedynym źródłem prawdy dla:
  - widoczności login form
  - widoczności logout
  - widoczności account link
  - labeli `Login / Account / Log out / Account Settings`
  - href do właściwego dashboardu wg roli

### 2. Docelowe reguły widoczności

| Kontekst | Header login form | Header session block | Header nav `Account` | Body actions |
| --- | --- | --- | --- | --- |
| Public page, guest | widoczny | ukryty | widoczny, prowadzi do `/auth.html` | guest CTA mogą prowadzić do `/auth.html` |
| Public page, zalogowany | ukryty | widoczny: status + `Log out` | widoczny, prowadzi do właściwego dashboardu | CTA `data-auth-link` zmieniają się na `Account`, bez `Open Account` |
| `auth.html`, guest | widoczny | ukryty | widoczny, prowadzi do `/auth.html` | widoczne login/register forms |
| `auth.html`, zalogowany | ukryty | ukryty w headerze | ukryty | widoczne tylko account settings + `Log out` |
| `client-dashboard.html`, zalogowany | ukryty | ukryty w headerze | ukryty | widoczne `Account Settings` i `Log out` |
| `manager-dashboard.html`, zalogowany | ukryty | ukryty w headerze | ukryty | widoczne `Account Settings`, `Log out`, plus manager-specific actions |
| Workspace, brak sesji / sesja wygasła | nie pokazujemy dashboard UI | nie pokazujemy dashboard UI | n/a | redirect do `/auth.html?next=...&reason=session` |

Domyślne decyzje:

- etykieta `Open Account` zostaje całkowicie usunięta
- etykieta `Auth Page` zostaje zastąpiona przez `Account Settings`
- `Logout` jest widoczny tylko w stanach authenticated
- `Login` jest widoczny tylko w stanach guest

### 3. Ujednolicenie nazw, CTA i zachowania

Używamy tylko tych nazw:

- `Login`
- `Account`
- `Account Settings`
- `Log out`

W praktyce:

- wszystkie linki z `data-auth-link` są session-aware i role-aware
- wszystkie guest-only elementy dostają wspólny hook `data-auth-guest-only`
- wszystkie user-only elementy dostają wspólny hook `data-auth-user-only`
- wszystkie settings links dostają wspólny hook `data-account-settings-link`

### 4. Spójność między public site, auth page i dashboardami

- `site.js`
  - centralnie renderuje session-aware header
  - centralnie mapuje role do route
  - centralnie toggluje `guest-only` i `user-only`
  - centralnie pilnuje redirectów dla protected routes
- `auth.js`
  - odpowiada tylko za logikę formularzy i account settings
  - nie dubluje już reguł headera z `site.js`
  - dla zalogowanego użytkownika pokazuje tylko session/account settings surface
- dashboard pages
  - usuwają duplikację logout/account controls w headerze vs body
  - zostawiają tylko sensowne actions w body:
    - `Account Settings`
    - `Log out`
    - manager-specific actions jak seed

## Public APIs / Interfaces

Backend bez zmian:

- `/api/auth/login`
- `/api/auth/me`
- obecne role i token/session storage

Zmienia się frontend contract:

- `data-auth-guest-only`
- `data-auth-user-only`
- `data-account-settings-link`
- `data-auth-link` dalej oznacza jedno session-aware wejście `Account`

## Test Plan

### Automaty

- `npm run generate:locations`
- `npm run generate:services`
- `npm run verify:generated`
- `npm run test:ci`
- Playwright coverage:
  - guest na homepage widzi login i nie widzi logout
  - authenticated na homepage nie widzi login form, widzi logout, `Account` prowadzi do właściwego dashboardu
  - authenticated na `auth.html` nie widzi guest forms i nie widzi header account duplicate
  - authenticated na `client-dashboard.html` i `manager-dashboard.html` nie widzi guest auth controls
  - guest wejście na workspace route robi redirect do `/auth.html?next=...`

### Manual QA

- guest:
  - `/`
  - `/about.html`
  - `/quote.html`
  - `/auth.html`
- authenticated client:
  - `/`
  - `/auth.html`
  - `/client-dashboard.html`
- authenticated manager/admin:
  - `/`
  - `/auth.html`
  - `/manager-dashboard.html`

## Assumptions

- nie zmieniamy backend API ani modelu ról
- `auth.html` pozostaje stroną konta i ustawień dla zalogowanego użytkownika
- public routes zachowują `Account` jako element menu, ale `auth.html` i workspace chowają ten duplikat po zalogowaniu
- `title.png`, sticky shell i obecny design system zostają; ta iteracja naprawia logikę i spójność działania, nie robi nowego redesignu
