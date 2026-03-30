# Level Lines - Mapa Strony I Ekranow

## Cel dokumentu

Ten dokument pokazuje strukturę wszystkich głównych stron i ekranów systemu: co gdzie jest, co pokazuje, jakie sekcje ma, jakie akcje obsługuje, do jakiego API się odnosi i jakie modele danych są zaangażowane.

## 1. Mapa wysokiego poziomu

```mermaid
graph TD
    A[Public brochure pages] --> B[Quote page]
    A --> C[Generated service/location pages]
    B --> D[Guest quote preview]
    D --> E[auth.html]
    E --> F[client-dashboard.html]
    E --> G[manager-dashboard.html]
    E --> H[/app-v2]
    H --> I[Client role areas]
    H --> J[Manager/Admin role areas]
    H --> K[Employee role areas]
    L[Android mobile-client] --> M[api/v2]
    N[Android mobile-company] --> M
    H --> M
    B --> O[api/v2/public/quotes]
    A --> P[Public services/gallery/content APIs]
```

## 2. Publiczne strony HTML

### 2.1 Ręczne strony brochure

| Strona | Plik / URL | Co pokazuje | Kluczowe sekcje | Główne akcje | API / dane | Modele / zależności |
| --- | --- | --- | --- | --- | --- | --- |
| Home | `index.html` | główny brand entry point | hero, oferta, CTA, nawigacja, dostęp do quote | przejście do services, gallery, quote, contact, account | public shell + brand config | `brand.js`, `site.js`, assets |
| About | `about.html` | pozycjonowanie studia i sposobu pracy | intro, studio story, scope, CTA | przejście do quote/contact | statyczny content + shared shell | renderer publiczny, style public |
| Services | `services.html` | zakres oferty | listy usług, CTA usługowe, wejścia do quote | wybór usługi, przejście do quote z kontekstem | public services data | `ServiceOffering`, `public services` helpers |
| Gallery | `gallery.html` | service-led gallery | rail usług, stage obrazów, meta aktywnej usługi | zmiana usługi, fullscreen obrazów | `/api/gallery/services`, `/api/v2/gallery/services` | folder-driven gallery, asset manifest |
| Quote | `quote.html` | publiczny intake | stepper `Basics / Scope / Brief`, upload zdjęć, preview panel | submit quote, claim handoff, follow-up upload | legacy quote route + `api/v2/public/quotes` adapter | `Quote`, `QuoteAttachment`, `QuoteClaimToken` |
| Contact | `contact.html` | kontakt i CTA | kontakt, copy, formularz kontaktowy | wysłanie wiadomości kontaktowej, przejście do quote | `POST /api/contact` | SMTP/contact flow |
| Privacy / Cookie / Terms | `privacy.html`, `cookie-policy.html`, `terms.html` | prawne strony pomocnicze | treść prawna, shared shell | nawigacja, account, quote | statyczne | shared public renderer/shell |

### 2.2 Strony generowane SEO

| Typ strony | Przykłady | Po co istnieje | Co ma w środku | Skąd się bierze |
| --- | --- | --- | --- | --- |
| Service pages | `premium-bathrooms-manchester.html`, `premium-kitchens-manchester.html` | pozycjonowanie usługowe | hero, summary, proof points, FAQ, CTA do quote | generator publicznych stron |
| Location pages | `premium-renovations-didsbury.html`, `premium-renovations-sale.html` | pozycjonowanie lokalne | hero lokalny, zakres usługi w lokalizacji, FAQ, CTA | generator publicznych stron |

Generated pages korzystają z tego samego publicznego shellu i mają prowadzić użytkownika do tego samego quote flow co strony ręczne.

## 3. Publiczny quote flow

| Ekran / stan | Gdzie jest | Co pokazuje | Co robi użytkownik | API | Modele |
| --- | --- | --- | --- | --- | --- |
| Quote form | `quote.html` i generated pages | 3-krokowy formularz + upload do 8 zdjęć | wypełnia dane projektu, brief, dodaje zdjęcia | `POST /api/quotes/guest` przez v2 contract path | `Quote`, `QuoteAttachment` |
| Private preview panel | po submit na tej samej stronie / z `publicToken` | referencja quote, workflow status, zdjęcia, akcje | sprawdza status, korzysta z prywatnego linku | `GET /api/quotes/guest/:publicToken` albo `/api/v2/public/quotes/:publicToken` | `Quote`, `QuoteAttachment` |
| Follow-up upload | w preview panelu | dodatkowy upload zdjęć | dosyła kolejne zdjęcia | `POST .../attachments` | `QuoteAttachment` |
| Claim request | preview panel | wybór kanału odzyskania dostępu | prosi o kod email / phone | `POST .../claim/request` | `QuoteClaimToken` |
| Claim confirm | `auth.html` po loginie/rejestracji | pole do wpisania kodu | potwierdza przejęcie quote | `POST .../claim/confirm` | `Quote`, `QuoteClaimToken`, `User` |

## 4. Legacy auth i dashboardy

### 4.1 `auth.html`

| Obszar | Co obsługuje | Dane / API |
| --- | --- | --- |
| Sign in | logowanie istniejącego użytkownika | legacy auth + `api/v2/auth/login` session bridge |
| Register | rejestracja klienta | `api/v2/auth/register` |
| Account panel | overview profilu, profile, security, workspace quick access | `/api/auth/me`, `/api/v2/auth/me`, `/api/v2/auth/profile`, `/api/v2/auth/password` |
| Claim handoff | przejęcie quote po loginie | claim storage + quote claim confirm |

`auth.html` jest jednocześnie ekranem wejścia do systemu i pomostem między publicznym quote flow a zalogowanymi surface'ami.

### 4.2 `client-dashboard.html`

| Obszar | Co pokazuje | Co obsługuje | API / modele |
| --- | --- | --- | --- |
| Overview | status projektów, mailbox preview, operacje | szybki podgląd klienta | projekty, powiadomienia, wiadomości |
| Projects | projekty klienta | podgląd statusu i dokumentów/media | `Project`, `ProjectMedia` |
| Messages | direct manager chat i project chat | komunikacja | `InboxThread`, `GroupThread` |
| Shell | sesja, logout, quick actions | bootstrap i redirect roli | auth/session helpers |

To jest działająca warstwa przejściowa dla klienta.

### 4.3 `manager-dashboard.html`

Manager workspace jest już przebudowany na układ kartowy.

| Karta | Co pokazuje | Co obsługuje | Główne dane |
| --- | --- | --- | --- |
| Overview | KPI, alerts, inbox preview, workload | szybki start pracy managera | agregaty overview |
| Projects | projekty i ich workflow | create/edit, stage, owner, due dates, media | `Project`, `ProjectMedia`, `User`, `Quote` |
| Quotes | kolejka zapytań | assign, review, request info, convert | `Quote`, `QuoteAttachment`, `Estimate` |
| Estimates | oferty i wersje | draft, send, revise, versioning | `Estimate`, `EstimateLine` |
| Inbox | private inbox + project chat | komunikacja operacyjna | `Inbox*`, `Group*` |
| Website | treści i SEO publicznych stron | content/metadata control | generator/content model |
| Services | oferta publiczna | create/edit service rows | `ServiceOffering` |
| Stock | materiały i stan magazynu | stock tracking, supplier data | `Material` |
| Clients / CRM | relacje i lifecycle klientów | CRM context, linked work | `User`, `ActivityEvent`, `Quote`, `Project` |
| Staff | zespół i role | role, aktywność, dane staff | `User` |

Quick Access rail po lewej przełącza jedną aktywną kartę bez pełnego reloadu i zapisuje stan w hash URL.

## 5. `web-v2` - nowa warstwa aplikacyjna

`apps/web-v2` to docelowa warstwa auth web, mountowana pod `/app-v2`.

| Obszar | Dla kogo | Co robi | Dane |
| --- | --- | --- | --- |
| Auth-aware shell | client, employee, manager, admin | ładuje użytkownika, role-aware navigation | `api/v2/auth/*` |
| Overview | wszystkie role, ale różne payloady | agregowany dashboard | `GET /api/v2/overview` |
| Projects | client + staff roles | projekty i workflow | `Project`, `ProjectMedia` |
| Quotes | client + manager/admin | quote lifecycle | `Quote`, `QuoteAttachment`, `Estimate` |
| Messages / Inbox | client + staff | private i project chat | `Inbox*`, `Group*` |
| Notifications | wszystkie role auth | unread state i alerts | `Notification` |
| CRM | staff roles | klient, lifecycle, aktywność | `User`, `ActivityEvent` |
| Inventory | staff roles | materiały i usługi | `Material`, `ServiceOffering` |
| Account | wszystkie role | profil, hasło, sesja | `User`, auth/session |

`web-v2` jest najważniejszym webowym kierunkiem rozwoju, ale legacy dashboards nadal utrzymują kompatybilność operacyjną.

## 6. Android - `mobile-client`

| Zakładka / flow | Co pokazuje | Co obsługuje | API |
| --- | --- | --- | --- |
| Sign in | login klienta | auth client-only | `/api/v2/auth/login` |
| Register | rejestracja klienta | tworzenie konta | `/api/v2/auth/register` |
| Submit Quote | mobile public quote flow | 3-krokowy formularz, zdjęcia, wysyłka quote | `/api/v2/public/quotes` |
| Claim Quote | claim prywatnego quote | preview, request code, confirm | `/api/v2/public/quotes/*` |
| Overview | podsumowanie klienta | recent quotes, projekty, alerts | `/api/v2/overview` |
| My Quotes | lista i szczegół quote | workflow, attachments, estimate state | `/api/v2/quotes` |
| My Projects | lista projektów | statusy, stage, powiązane dane | `/api/v2/projects` |
| Inbox | direct/project messaging | komunikacja z firmą | `/api/v2/messages` |
| Notifications | alerty klienta | unread and read state | `/api/v2/notifications` |
| Account | profil i hasło | update profilu, logout | `/api/v2/auth/*` |

## 7. Android - `mobile-company`

| Zakładka / flow | Dla kogo | Co pokazuje | API |
| --- | --- | --- | --- |
| Overview | employee, manager, admin | dashboard firmy | `/api/v2/overview` |
| Projects | staff roles | projekty i ich workflow | `/api/v2/projects` |
| Quotes | staff roles | new enquiries i review | `/api/v2/quotes` |
| Estimates | manager/admin focus | wersje ofert, approval flow | `/api/v2/quotes`, estimate data |
| Inbox | staff roles | private + project comms | `/api/v2/messages` |
| Notifications | staff roles | powiadomienia firmowe | `/api/v2/notifications` |
| CRM | manager/admin | klienci i lifecycle | `/api/v2/crm` |
| Inventory | manager/admin/employee zależnie od UI gating | materiały i usługi | `/api/v2/inventory` |
| Account | wszystkie role firmowe | profil, sesja, hasło | `/api/v2/auth/*` |

## 8. Shared mobile packages

| Pakiet | Co zawiera | Kto używa |
| --- | --- | --- |
| `packages/mobile-core` | auth/session helpers, API client, upload helpers, pollery, quote defaults | `mobile-client`, `mobile-company` |
| `packages/mobile-ui` | wspólne komponenty RN i design language | `mobile-client`, `mobile-company` |
| `packages/mobile-contracts` | mobile-facing typy i walidacja oparte o `shared/contracts/v2` | `mobile-client`, `mobile-company` |

## 9. Co gdzie zapisuje stan

| Surface | Gdzie trzyma stan |
| --- | --- |
| Public brochure pages | lekki browser state + DOM + auth/session helpers |
| `auth.html` / legacy pages | `localStorage` (`ll_auth_token`, `ll_auth_user`, `ll_v2_access_token`, `ll_v2_refresh_token`) |
| `site.js` auth shell | `localStorage` + cache `/api/auth/me` w `sessionStorage` |
| `web-v2` | React state + API payloads |
| Android apps | shared mobile session helpers + app state |
| Backend | Postgres przez Sequelize |

## 10. Jak ekran odnosi się do danych

Najważniejsza zasada systemu jest taka:

- brochure pages i generated pages budują popyt i kierują do quote,
- quote zapisuje pierwszy rekord operacyjny,
- estimate porządkuje ofertę handlową,
- project przenosi klienta do delivery,
- inbox/group chat i notifications utrzymują relację,
- CRM i activity nadają kontekst pracy firmy,
- `web-v2` i Android są warstwami zużywającymi ten sam kontrakt biznesowy.

Jeśli trzeba szybko zlokalizować odpowiedzialność:

- ekran mówi użytkownikowi *co może zrobić*,
- API mówi *jakie dane pobiera lub zapisuje*,
- model mówi *co jest prawdą systemową*.
