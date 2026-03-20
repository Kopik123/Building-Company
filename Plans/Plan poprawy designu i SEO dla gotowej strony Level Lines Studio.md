# Plan poprawy designu i SEO dla gotowej strony Level Lines Studio

## Summary
Celem jest doprowadzenie strony do stanu launch-ready bez przebudowy stosu technologicznego: zachowujemy obecny kierunek `Luxury Polish`, ale upraszczamy copy, usuwamy pomocnicze teksty, wzmacniamy hierarchi? wizualn? i zamykamy SEO wok?? lokalnego lead-gen dla us?ug premium w Manchesterze i North West. Plan obejmuje ca?? stron?, ale SEO dotyczy tylko indeksowalnych stron publicznych; `auth` i dashboardy dostaj? wy??cznie cleanup designu i copy.

## Key Changes
### 1. Public design polish
- Ujednolici? wszystkie publiczne strony do jednego rytmu: kr?tszy hero, mocniejsze H1, mniej tekstu nad foldem, jeden dominuj?cy CTA lub proof strip na ekran.
- Zredukowa? pomocnicze copy na stronach publicznych: usuwa? teksty typu ?how to browse?, ?before you send?, ?this is the main conversion route?, obja?nienia oczywistego UI i wype?niacze mi?dzy sekcjami.
- Zostawi? wy??cznie:
  - nag??wki sekcji
  - 1 kr?tki lead sprzeda?owy tam, gdzie jest potrzebny
  - proof points / metrics / chips
  - CTA
  - walidacj? formularzy
  - tekst prawny/polityki
- Ujednolici? hierarchy komponent?w:
  - `Home`, `About`, `Services`, `Gallery`, `Quote`, `Contact` maj? korzysta? z tych samych wariant?w: hero, proof row, selected project/media, FAQ, CTA band
  - gallery ma by? bardziej produktowa ni? opisowa
  - quote ma by? bardziej formularzem sprzeda?owym ni? stron? z instrukcjami
- Uporz?dkowa? auth/account/dashboard shell:
  - usun?? marketingowe helper texty
  - zostawi? tylko task-oriented labels, status, validation, empty state i quick access
  - zachowa? obecny luxury shell, ale z mniejsz? g?sto?ci? tekstu

### 2. Public content model i IA
- Potraktowa? publiczny web jako 3 klastry intencji:
  - homepage + trust pages: marka, wiarygodno??, kontakt
  - service pages: oferta i intent us?ugowy
  - location pages: intent lokalny
- Rozszerzy? generator publicznych stron o pola redakcyjne potrzebne do launch-ready SEO:
  - `primaryKeyword`
  - `searchIntent`
  - `summaryLine`
  - `proofPoints`
  - `internalLinks`
  - `suppressHelperCopy`
- Ustali? sta?? zasad? copy:
  - hero: 1 H1 + 1 lead + chips/proof
  - ka?da kolejna sekcja: 1 nag??wek + kr?tki body albo lista punkt?w
  - FAQ tylko tam, gdzie realnie wzmacnia intent i schema
- Services page ma by? centralnym hubem wewn?trznego linkowania do service pages i location pages.
- Location pages maj? linkowa? do w?a?ciwych us?ug i do `Quote`, a nie istnie? jako samotne landing pages.

### 3. SEO implementation
- Ka?da indeksowalna strona publiczna musi mie?:
  - unikalny `title`
  - unikalny `meta description`
  - pojedynczy `H1`
  - `canonical`
  - komplet `og:*` i `twitter:*`
  - w?a?ciwy JSON-LD
- Zachowa? i uporz?dkowa? noindex rules:
  - `auth.html`, `client-dashboard.html`, `manager-dashboard.html` zostaj? `noindex,follow`
  - nie trafiaj? do sitemap
- Uporz?dkowa? schema strategy:
  - `Home`: `LocalBusiness` + `WebSite`
  - `About`: `AboutPage`
  - `Contact`: `ContactPage`
  - `Services`: `CollectionPage`
  - `Gallery`: `CollectionPage`
  - service/location pages: `Service`
  - `FAQPage` tylko tam, gdzie FAQ zostaje po cleanupie copy
  - `BreadcrumbList` na wszystkich publicznych stronach indeksowalnych poza homepage
- Rozbudowa? sitemap i internal linking pod lokalne SEO:
  - homepage linkuje do g??wnych us?ug i lokalizacji
  - service pages linkuj? do relevant location pages
  - location pages linkuj? do relevant service pages
  - ka?da indeksowalna strona prowadzi do `Quote`
- Ustali? launch-ready SEO defaults:
  - target: premium renovation leads, nie ruch informacyjny
  - keyword ownership:
    - homepage: brand + premium renovation studio
    - services: service intent
    - locations: local intent
  - brak thin pages bez jednoznacznego intentu

### 4. Performance, accessibility i crawl quality
- Dopi?cie designu i SEO ma i?? razem z ograniczeniem bloatu:
  - mniej copy i mniej zb?dnych sekcji
  - bardziej przewidywalne wysoko?ci hero
  - mocniejsze first-screen hierarchy
- Ka?dy publiczny obraz musi mie? sensowny alt i przewidywalny rozmiar/rendering.
- Zachowa? current generated-page workflow, ale dopilnowa?:
  - brak duplicate titles/descriptions
  - brak duplicate H1
  - brak pustych sections po wyci?ciu helper copy
  - brak orphan pages w sitemap
- Acceptance target:
  - `npm run verify:generated` zielone
  - `npm run test:ci` zielone
  - brak poziomego scrolla na mobile
  - brak helper copy na g??wnych publicznych ekranach
  - indeksowalne strony zachowuj? komplet meta/schema/canonical

### 5. Rollout order
- Etap 1: homepage, services, quote, gallery
- Etap 2: about, contact, legal/trust pages
- Etap 3: generated service pages
- Etap 4: generated location pages
- Etap 5: auth/account/dashboard visual cleanup
- Etap 6: final SEO sweep, sitemap validation, rich-results/manual SERP preview QA

## Test Plan
- Automated:
  - `npm run verify:generated`
  - `npm run test:ci`
  - Playwright desktop/mobile dla: `index`, `services`, `gallery`, `quote`, `contact`, `auth`, `manager-dashboard`, `client-dashboard`
- Static SEO assertions:
  - ka?dy publiczny page ma unikalny `title`, `meta description`, `canonical`, `H1`
  - auth/dashboard pages pozostaj? `noindex`
  - sitemap zawiera tylko indeksowalne strony
  - JSON-LD odpowiada typowi strony
- Visual/content QA:
  - brak pomocniczych tekst?w na g??wnych publicznych kartach
  - hero nie jest prze?adowany
  - CTA s? widoczne bez przewijania na kluczowych stronach
  - gallery i quote nie maj? ju? instrukta?owego/fillerowego copy
- Manual SEO QA:
  - rich results validation dla service/location pages
  - social preview check dla homepage, services, gallery i przyk?adowej location page
  - r?czny crawl check linkowania wewn?trznego mi?dzy home/services/location/quote

## Assumptions
- Zakres `Whole Site` oznacza:
  - pe?ny cleanup designu dla public/auth/workspace shell
  - SEO tylko dla indeksowalnych stron publicznych
- `No helper texts` oznacza usuni?cie wi?kszo?ci obja?niaj?cego copy z UI i publicznych kart, przy zachowaniu:
  - legal copy
  - walidacji
  - empty states
  - kr?tkiego sales copy tam, gdzie wspiera konwersj? lub intent
- Nie robimy teraz migracji frameworkowej.
  - Lepsza technologia d?ugofalowo dla designu + SEO to `Astro` albo `Next.js` z mocniejszym content/model pipeline.
  - Na teraz nie warto tego wdra?a?, bo obecny generator statycznych stron ju? daje dobry punkt wyj?cia i szybszy zwrot z polish + SEO cleanup.
