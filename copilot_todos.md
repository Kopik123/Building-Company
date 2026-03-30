# Copilot – Pełna Lista Todos z Analizy Projektu

> Wygenerowano: 2026-03-30  
> Źródło: Pełna analiza projektu Level Lines Studio

---

## 🔴 P0 – KRYTYCZNE (Błędy / Security)

- [ ] **#1 – `cookie-parser` zainstalowany ale nieużywany** – usunąć z `package.json` (zbędna zależność zwiększająca attack surface)
- [ ] **#2 – `bootstrap/rotate-key` mutuje klucz tylko w `process.env`, nie zapisuje trwale** – klucz wraca do starego po restarcie serwera; rotacja jest iluzoryczna (`routes/auth.js:231`)
- [ ] **#3 – `createClaimCode()` używa `Math.random()` zamiast `crypto.randomInt()`** – OTP musi być kryptograficznie bezpieczny (`routes/quotes.js:14`)
- [ ] **#4 – `base.css` deklaruje fonty `Inter` + `Playfair Display`, które NIE SĄ ładowane w HTML** – HTML ładuje tylko `Cormorant Garamond` + `Montserrat`; użytkownik dostaje fallback systemowy
- [ ] **#5 – Dwa niezależne systemy tokenów CSS koegzystują** – `base.css` (stary: `--black`, `--gold`, `--space-1..6`) vs `tokens.css` (nowy: `--ll-bg`, `--ll-accent-gold`, `--ll-space-sm`); ~50 odwołań do starych tokenów w `base.css` koliduje z nowymi regułami
- [ ] **#6 – Brak favicon** – żaden HTML nie ma `<link rel="icon">`; przeglądarka dostaje 404 przy każdym wejściu
- [ ] **#7 – CSP zawiera `'unsafe-inline'` dla scriptów** – `scriptSrc: ["'self'", "'unsafe-inline'"]` otwiera na XSS; użyć `nonce` lub `hash` dla inline skryptów (`app.js:71`)
- [ ] **#8 – `safeCompare()` w auth.js – wczesny exit przy różnych długościach** – timing leak przy porównaniu klucza bootstrap (`routes/auth.js:21-30`)

---

## 🟠 P1 – WYSOKIE (Refaktor / Architektura)

- [ ] **#9 – `multer 1.x` z deprecation warnings** – zaplanować migrację do `multer 2.x` (znany todo z `Project_todos.md`)
- [ ] **#10 – `manager-dashboard.js` – 2087 linii w jednym pliku** – podzielić na moduły: projects, quotes, services, materials, clients, staff, estimates, messages
- [ ] **#11 – `routes/manager.js` – 1151 linii, częściowo zrefaktorowany** – dokończyć split: wyekstrahować quotes i projects/media do osobnych subrouterów
- [ ] **#12 – `styles/base.css` – 5618 linii** – zawiera stary i nowy design system jednocześnie; wydzielić lub usunąć nieużywane reguły starego systemu
- [ ] **#13 – Zduplikowana logika SMTP transporter** – `routes/contact.js` i `routes/quotes.js` mają identyczną kopię tworzenia transportera; wyekstrahować do `utils/mailer.js`
- [ ] **#14 – Duplikacja nagłówka `<header>` w każdym pliku HTML** – ten sam blok wklejony do N plików; brak mechanizmu szablonowania (partials/SSI/build step)
- [ ] **#15 – JWT 7d bez mechanizmu revoke** – token ważny 7 dni po logout; brak blacklisty tokenów ani refresh token flow w v1 (v2 ma `SessionRefreshToken` ale tylko w v2)
- [ ] **#16 – Usunąć zbędną zależność `cookie-parser`** – w `package.json` jest `"cookie-parser": "^1.4.6"` ale nigdzie nie jest importowana ani używana
- [ ] **#17 – Brak `rel="noopener noreferrer"` na linkach zewnętrznych** – sprawdzić i dodać do linków do map, mediów społecznościowych etc.

---

## 🟡 P2 – ŚREDNIE (Cleanup / SEO / Performance)

### Zbędne pliki i katalogi do usunięcia

- [ ] **#18 – `styles.css` w korzeniu** – wrapper z 4x `@import`, nigdzie nie referencowany w HTML; martwy plik
- [ ] **#19 – Pliki graficzne w korzeniu repo** – `header.png`, `logo.png`, `logo4.png`, `logo4backup.png`, `title.png`, `readyprint2.png` przenieść do `assets/` lub usunąć
- [ ] **#20 – Katalog `backup/logos/`** – backup folder z `logo4_1.png` w produkcyjnym repo
- [ ] **#21 – Katalog `design/` z plikami wizytówek** – `back wizytowka.png`, `front wizytowka.png` – pliki designerskie nie produkcyjne
- [ ] **#22 – Katalog `code/dev_plan/`** – pusty folder
- [ ] **#23 – Katalog `iteBuilding-Company/`** – tajemniczy pusty katalog, prawdopodobnie typo/artefakt
- [ ] **#24 – Katalog `.anima/`** – leftover z narzędzia Anima (Figma-to-code), nieużywany
- [ ] **#25 – `DESIGNER_BRIEF_LEVELLINES.md`** – wrażliwy dokument wewnętrzny w publicznym repo
- [ ] **#26 – `todos.md` i `dev_plan.md` (małe litery) vs `Project_todos.md` / `Project_Dev_plan.md`** – duplikaty starych wersji do usunięcia
- [ ] **#27 – `asset-manifest.js` trackerowany w git** – generowany plik nie powinien być commitowany
- [ ] **#28 – `Gallery/premium/` (41MB) w git** – wygenerowane warianty mediów powinny być na CDN/Object Storage, nie w git

### SEO / Performance

- [ ] **#29 – Brak `<link rel="preload">` dla kluczowych obrazów LCP** – `title.avif` w nagłówku i hero image powinny mieć preload
- [ ] **#30 – `og:type="website"` na wszystkich stronach** – location pages powinny mieć `og:type` bardziej specyficzny
- [ ] **#31 – Brak `ImageObject` w JSON-LD galerii** – stracona szansa na rich snippets w Google Images
- [ ] **#32 – Canonical URL-e z `.html` rozszerzeniami** – premium strony powinny unikać `.html`; dodać Nginx rewrite
- [ ] **#33 – CSS cache `max-age=86400` bez content hash** – brak cache busting; użytkownik może dostawać stare style po deploy
- [ ] **#34 – `robots.txt` zezwala na wszystko (`Allow: /`)** – brak blokady `/api/`, `/uploads/`, dashboardów
- [ ] **#35 – `<html lang="en">` zamiast `<html lang="en-GB">`** – dla UK studio `en-GB` poprawia dostępność i spellcheck

### Architektura

- [ ] **#36 – Dwa systemy API: v1 (`/api/*`) + v2 (`/api/v2/*`) bez polityki deprecacji** – brak jasnego planu wygaszania v1
- [ ] **#37 – Dwa health check endpointy: `/healthz` i `/api/v2/health`** – jeden wystarczy
- [ ] **#38 – `process.env.PORT` nie waliduje poprawności** – `Number("")` = 0, serwer słucha na porcie 0 (random)
- [ ] **#39 – `Gallery/` główna: 19 surowych zdjęć z telefonu (1–5MB, nazwy `IMG_*`)** – brak optymalizacji; powinny iść przez sharp pipeline

---

## 🔵 P3 – NISKIE (Długoterminowe / Nice-to-have)

### Mobile / App Readiness

- [ ] **#40 – `apps/web-v2` (React/Vite) nie jest zintegrowany z serwerem Express** – Vite dev na :5173, brak proxy; `dist/` nie jest serwowany przez Express
- [ ] **#41 – `apps/mobile-v1` (React Native/Expo) – skeleton bez `npm install`** – App.js importuje moduły które nie są dostępne
- [ ] **#42 – `DevicePushToken` zaimplementowany w modelu ale brak logiki wysyłania pushów** – endpoint rejestruje tokeny, ale nic ich nie używa

### CI/CD i Testing

- [ ] **#43 – Brak CI/CD pipeline** – testy (`tests/api-v2/`, `tests/playwright/`) uruchamiane tylko manualnie
- [ ] **#44 – `scripts/sonar-export.sh` bez skonfigurowanego SonarQube** – wymaga `SONAR_URL`/`SONAR_TOKEN` których nie ma w `.env.example` ani workflow
- [ ] **#45 – `ACCESS_TOKEN_EXPIRES_IN` / `REFRESH_TOKEN_EXPIRES_DAYS` w `.env.example`** – używane tylko w `api/v2/routes/auth.js`; stary auth (`routes/auth.js`) je ignoruje

### Dokumentacja / Plany

- [ ] **#46 – 11 planów w `Plans/` + `Project_todos.md` + `Project_Dev_plan.md` commitowane do repo** – rozważyć przeniesienie do GitHub Wiki lub Notion
- [ ] **#47 – Kontynuować split `manager-dashboard.js`** – po stabilizacji nowego overview shell
- [ ] **#48 – Kontynuować split `client-dashboard.js`** – po stabilizacji nowego top board
- [ ] **#49 – Kontynuować redukcję `apps/mobile-v1/App.js`** – wyekstrahować session/tab shell logic

---

## 📊 Podsumowanie

| Priorytet | Ilość | Główne obszary |
|---|---|---|
| 🔴 P0 – Krytyczne | 8 | Security, CSS bugs, brak favicon |
| 🟠 P1 – Wysokie | 9 | Refaktor monolitów, JWT, duplikacje |
| 🟡 P2 – Średnie | 22 | Cleanup plików, SEO, performance, architektura |
| 🔵 P3 – Niskie | 10 | Mobile app, CI/CD, dokumentacja |
| **Łącznie** | **49** | |
