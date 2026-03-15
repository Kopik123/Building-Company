# Redesign Od Zera: Cala Strona, Design, IA I SEO

## Summary

- Cel: przebudowac caly publiczny web tak, aby byl prosty, profesjonalny, quote-first, latwy w obsludze i spojny wizualnie.
- Głowny kierunek:
  - quote-first homepage i public IA
  - jakosciowe, uporzadkowane SEO
  - jeden sticky shell z `title.png`, logowaniem i menu
  - ciemne tlo strony + jasne karty + zloty tekst/akcenty na dark surfaces
- Wdrozenie ma objac manual public pages, generated service/location pages, shell, treści i head SEO.

## Key Changes

### 1. Public IA

- Uklad publicznego webu wokol:
  - `Home`
  - `About`
  - `Services`
  - `Gallery`
  - `Quote`
  - `Contact`
  - `Account`
- `Home` ma prowadzic do wyceny i jasno pokazywac:
  - uslugi
  - wybrane realizacje
  - proces
  - coverage / zaufanie
  - CTA do `Quote`
- `Services` ma stac sie glownym hubem uslug i linkowac do service pages.
- Obecne service/location pages zostaja, ale musza zostac wizualnie i tresciowo podporzadkowane jednej strukturze.

### 2. Sticky Shell

- Jeden wspolny sticky shell dla wszystkich public pages.
- Desktop:
  - `title.png`
  - pola `Login` i `Password` z placeholderami w polach
  - button `Menu`
  - pionowa rozwijana lista menu
- Mobile:
  - sticky `title.png`
  - uproszczony dostep do login/account
  - menu jako pionowy dropdown
- Shell ma byc jedynym top systemem nawigacji, bez zdublowanych paskow i paneli.

### 3. Design System

- Tlo strony: czarne / ciemne.
- Karty i glowne powierzchnie tresci: jasne.
- Typografia i akcenty na dark surfaces: zloty.
- Kazda strona publiczna ma uzywac jednego rytmu:
  - sticky shell
  - hero
  - 2-4 sekcje tresci
  - jedno wyrazne CTA
  - spojna stopka
- Brak poziomego scrolla i czysty pierwszy ekran na mobile.

### 4. SEO

- SEO ma byc jakosciowe, nie spamowe.
- Service/location pages maja dostac:
  - unikalny H1
  - unikalny hero lead
  - lokalny lub uslugowy kontekst
  - FAQ
  - CTA do `Quote`
  - canonical + meta title + meta description
- Structured data:
  - `LocalBusiness`
  - `BreadcrumbList`
  - `FAQPage` tam, gdzie ma sens

### 5. Repo Implementation

- Bez rewrite na nowy framework.
- Wdrozenie przez:
  - `scripts/publicPageRenderer.js`
  - `scripts/publicPages.shared.js`
  - `site.js`
  - `styles/public.css`
  - `brand.js`
  - manual public pages
  - generated service/location pages

## Test Plan

- Visual / UX:
  - `Home`
  - `About`
  - `Services`
  - `Gallery`
  - `Quote`
  - `Contact`
  - `Account`
  - legal pages
  - minimum 2 service pages
  - minimum 2 location pages
- Responsive:
  - `390px`
  - `640px`
  - `992px`
  - desktop full width
- Validation:
  - `npm run generate:public-pages`
  - `npm run verify:generated`
  - `npm run test:ci`
  - live QA po deployu

## Assumptions

- Strona ma byc premium quote-first website, nie portalem klienta ani agresywna farma SEO.
- `title.png` pozostaje glownym brand elementem sticky shellu.
- Wszystkie obecne service/location pages zostaja i sa przebudowywane.
- Desktop ma pelny sticky login, mobile ma wariant uproszczony.
