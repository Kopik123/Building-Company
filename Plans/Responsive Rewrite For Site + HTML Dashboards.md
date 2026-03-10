# Responsive Rewrite For Site + HTML Dashboards

## Summary

- Zakres obejmuje cały obecny serwis HTML:
  - homepage
  - strony usług, lokalizacji i legal pages
  - `auth.html`
  - `client-dashboard.html`
  - `manager-dashboard.html`
- Nie powstają osobne mobilne URL-e ani osobne widoki natywne.
- Całość ma działać spójnie na mobile i PC w jednym systemie layoutu, kolorów i komponentów.

## Key Changes

- Wspólny system responsive:
  - Jeden zestaw tokenów dla mobile/tablet/desktop w `styles.css`: spacing, type scale, header height, card radius, safe-area insets, tap targets 44px+.
  - Docelowe progi projektowe: `360-430`, `640`, `992`, `1280+`.
  - Zerowy poziomy scroll, pełna czytelność formularzy, kart, filtrów i galerii na mobile.
  - Ten sam dark/gold visual system dla public shell i workspace shell, z jaśniejszymi kartami tylko tam, gdzie zwiększa to czytelność.

- Branding i shell:
  - Public pages używają `title.png`.
  - Workspace/auth/dashboard shell używa pomocniczego `logo4.png`.
  - `readyprint2.png` wypada z runtime.
  - Górne menu publiczne: `Services / Projects / Gallery / Account`.
  - `Gallery` i `Contact` są scalone w jeden link `Gallery`.

- Homepage / public studio board:
  - Panel kontaktowy zmienia układ na:
    - lewa góra: `Coverage`
    - prawa góra: `Services`
    - dół na pełną szerokość: `Contact details`
  - Usunięte stare copy:
    - `Direct Contact`
    - `Contact details, curated scope and coverage kept in one place.`
    - `Direct studio numbers and email stay visible...`
  - Dodane inline SVG ikony:
    - `Coverage`: map pin
    - `Services`: grid / curated offer
    - `Contact details`: phone + envelope
  - Wszystkie publiczne formularze dostają wspólny tytuł i opis:
    - `Send Enquiry`
    - `Share the rooms involved, the finish ambition and your timing. The studio replies with a measured next step.`

- Gallery / aktywne nazwy:
  - Lewy nagłówek galerii pokazuje nazwę aktualnego zdjęcia.
  - Prawy opis pokazuje nazwę aktywnego projektu.
  - Placeholdery znikają:
    - `Image roller for the active project.`
    - `Vertical project selector.`
    - `Choose the project on the right, then rotate the selected image sequence on the left.`
  - Dane galerii wspierają `project.name` oraz `images[].label`; bez `label` nazwa bierze się z filename.

- Auth page:
  - Panel z tekstem o koncie przechodzi na ciemny/złoty wariant.
  - `Existing Account` i `New Account` mają identyczną wysokość i układ.
  - `Existing Account` dostaje krótki opis zalet konta pod `Login`.
  - Mobile: obie karty układają się w jedną kolumnę bez utraty hierarchii.
  - Desktop: dwie równe kolumny, wizualnie zbalansowane.

- Client dashboard:
  - Wszystkie sekcje dostosowane do mobile/PC: projekty, dokumenty, quotes, services, komunikacja.
  - Dodać osobną sekcję `Direct Manager` dla prywatnej rozmowy client-manager.
  - Zostawić istniejący chat grupowy projektu jako osobny blok `Project Chat`.

- Manager/admin dashboard:
  - Zachować obecne zarządzanie:
    - projects
    - quotes
    - services
    - materials
  - Rozszerzyć o:
    - `Clients`
    - `Staff`
    - `Estimate Builder`
  - `Estimate Builder`:
    - kosztorys przypisany do projektu albo wyceny
    - pozycje z bazy usług i materiałów
    - ilość, cena jednostkowa, korekta ręczna, subtotal, total
    - manager/admin: pełna edycja
  - Dodać dwa osobne moduły wiadomości:
    - `Private Inbox`
    - `Project Chat`

- Messaging model:
  - Prywatne wiadomości client-manager korzystają z istniejącego inbox 1:1.
  - Chat grupowy przypisany do projektu korzysta z istniejących group threads.
  - UI pozostaje rozdzielone: prywatne rozmowy i projektowe rozmowy nie są scalane w jeden widok.

## Public APIs / Interfaces

- Bez zmian w publicznych URL-ach strony.
- Bez nowych mobilnych tras.
- Frontend po zmianie:
  - nav publiczne: `Services / Projects / Gallery / Account`
  - wszystkie publiczne formularze: `Send Enquiry`
  - gallery data: `project.name`, opcjonalne `images[].label`
  - ikony: inline SVG, bez nowej biblioteki
- Backend operacyjny:
  - prywatny chat: istniejący inbox 1:1
  - project chat: istniejące thread-y grupowe
  - kosztorysy: nowa encja `Estimate` + `EstimateLine` i endpointy manager/admin

## Test Plan

- Responsive acceptance:
  - brak poziomego scrolla przy `360`, `390`, `768`, `1280`
  - nav/drawer działa na mobile i nie zasłania treści
  - formularze, galerie, dashboard filters i karty mieszczą się bez łamania layoutu
- Public pages:
  - homepage
  - jedna strona usługi
  - jedna lokalizacja
  - jedna legal page
  - sprawdzenie nowego układu `Coverage / Services / Contact details`
  - sprawdzenie ikon
  - sprawdzenie `Send Enquiry`
- Auth/dashboards:
  - równe wysokości `Existing Account` i `New Account`
  - client dashboard działa na mobile i desktop
  - manager dashboard działa na mobile i desktop
- Messaging:
  - prywatny inbox client-manager
  - project chat
  - role access dla client / employee / manager / admin
- Automation:
  - rozszerzyć Playwright o:
    - desktop Chromium
    - mobile Chromium
    - mobile WebKit / iPhone
  - zachować:
    - `generate:public-pages`
    - `verify:generated`
    - `test:ci`

## Assumptions

- „Wszystko” oznacza cały obecny serwis HTML, bez `apps/web-v2` i `apps/mobile-v1`.
- Publiczny i workspace UI pozostają po angielsku.
- `Contact` znika tylko z top nav, nie z treści strony.
- Prywatny chat i chat projektowy pozostają oddzielone w danych i UI.
