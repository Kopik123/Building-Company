# Premium Marble / Dark Gold Theme Replan

## Summary

- Kierunek bazowy:
  caly serwis, `black-led`, z bialym/czarnym marmurem jako powierzchniami i subtelnym motywem ciemno-zlotych ramek oraz podzialow.
- Cel:
  doprowadzic obecny styl do jednego, konsekwentnego premium systemu bez zmiany architektury strony i bez dokladania nowych kolorow pobocznych.
- Definicja motywu:
  "ramki okien" oznaczaja cienkie, eleganckie podzialy, osie i obrysy kart/sekcji, nie ciezkie dekoracyjne ramy art-deco.

## Key Changes

### 1. Design tokens i kolorystyka

- Uporzadkowac palete w jednym systemie tokenow:
  - tla: gleboka czern, grafit, atrament
  - jasne powierzchnie: bialy marmur, kosc sloniowa, chlodny kamien
  - akcenty: ciemne antyczne zloto, przygaszone zlote linie, mocniejszy zloty tylko na CTA i stanach hover
- Rozdzielic tokeny na:
  - `background`
  - `surface`
  - `text`
  - `line/frame`
  - `accent`
  - `interactive`
- Usunac wszelkie zbyt cieple, zbyt zolte lub przypadkowe zlote odcienie, ktore nie mieszcza sie w "dark gold".

### 2. Public shell i homepage

- Header:
  - `logo.png` po lewej, `title.png` centralnie, utility/login po prawej
  - bialo-marmurowe panele headera na czarnym tle
  - cienkie ciemno-zlote obrysy i podzialy wewnetrzne
- Homepage:
  - zachowac uklad z projektu: `header / login / projects / gallery / services / contact / quote`
  - `Gallery` i `Projects` jako glowne marmurowe panele w gornej strefie
  - `Services` i `Quote` jako ciemne, bardziej operacyjne bloki ponizej
  - `Contact` jako pelny pas dolny, z ciemnym tlem i zlota linia ramujaca
- Motyw ramek:
  - hero, gallery rail, service cards, quote form i contact band dostaja spojne obrysy i pionowe/poziome podzialy
  - bez ciezkich ramek wokol kazdego elementu; priorytet ma rytm linii i symetria

### 3. About / Gallery / Contact / Quote / service pages / legal

- Wszystkie publiczne strony dostaja ten sam premium shell:
  - czarne tlo strony
  - marmurowe hero/cards
  - ciemno-zlote linie sekcyjne
  - te same proporcje spacingu i ramek
- `About`, `Gallery`, `Contact`, `Quote` maja wygladac jak jedna rodzina:
  - jasny hero panel na ciemnym tle
  - ciemne sekcje przeplatane marmurowymi kartami
  - zlote linie jako separator sekcji, nie ozdoba przypadkowa
- Service i location pages:
  - zachowac SEO i strukture tresci
  - dopasowac tylko visual system, nie mieszac nowych layoutow per strona

### 4. Auth i dashboardy

- Workspace ma dostac ten sam jezyk premium, ale bardziej spokojny:
  - mniej marketingu
  - wiecej czytelnosci i porzadku operacyjnego
- Auth:
  - marmurowe karty formularzy na czarnym tle
  - ciemno-zlote ramki, subtelne podzialy wewnetrzne
- Client/manager dashboards:
  - ciemne tlo shellu
  - jasne operacyjne karty
  - zlote akcenty tylko na aktywnych stanach, przyciskach i obrysach
  - sekcje komunikacji, quotes, services, estimates musza wygladac jak czesc tej samej marki, ale bez ozdobnego przeladowania

### 5. Responsive i detale premium

- Mobile:
  - zachowac ten sam kolorystyczny system, bez "uproszczonej" wersji kolorow
  - ramki i zlote linie pozostaja, ale sa lzejsze niz na desktopie
  - login / projects / gallery / services / contact / quote maja czytelny pionowy rytm
- Desktop:
  - mocniej wykorzystac symetrie, podzialy pionowe i sekcyjne linie
  - wieksze marmurowe powierzchnie dla hero, gallery i key panels
- Kontrast i jakosc:
  - ciemne zloto musi miec odpowiedni kontrast na czerni
  - tekst na marmurze zostaje ciemny i stabilny
  - zadnych niskokontrastowych ozdobnikow kosztem czytelnosci

## Public APIs / Interfaces

- Brak zmian backend API.
- Brak zmian URL-i.
- Brak zmian primary nav labels:
  `About Us | Gallery | Contact | Quote | Account`
- Zmiana dotyczy wylacznie warstwy visual system, shella i konsekwencji CSS/HTML.

## Test Plan

- Visual acceptance:
  - desktop: homepage, about, gallery, contact, quote, auth, client dashboard, manager dashboard
  - mobile: brak poziomego scrolla, zachowany porzadek sekcji, czytelne CTA, proporcjonalne ramki
- Functional smoke:
  - header/nav nadal dziala
  - quote/contact forms nadal dzialaja
  - dashboards pozostaja czytelne i nie traca stanow aktywnych
- Theme consistency checks:
  - tylko czarny / marmur / dark gold
  - brak obcych akcentow kolorystycznych
  - spojne linie, obrysy, radiusy i separatory
- Regression:
  - Playwright dla homepage, brand pages i workspace
  - szybki przeglad headera, gallery rail, quote panelu i footerow na `390`, `768`, `1280`, `1440`

## Assumptions

- Motyw obejmuje caly serwis, nie tylko public pages.
- Dominujaca baza to czern; marmur jest powierzchnia paneli i kart, nie tlem calej strony.
- "Ramki okien" wdrazamy jako subtelny system linii, podzialow i obrysow, nie ciezka dekoracje.
- Zloto ma byc ciemne, przygaszone i premium, nie jasne ani zolte.
