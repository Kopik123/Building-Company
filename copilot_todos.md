# Copilot – Pełna Lista Todos z Analizy Projektu

> Wygenerowano: 2026-03-30  
> Ostatnia aktualizacja: 2026-03-30  
> Źródło: Pełna analiza projektu Level Lines Studio

---

## 🔴 P0 – KRYTYCZNE (Błędy / Security)

- [x] **#1 – `cookie-parser` zainstalowany ale nieużywany** – ✅ Usunięto z `package.json`
- [x] **#2 – `bootstrap/rotate-key` mutuje klucz tylko w `process.env`, nie zapisuje trwale** – ✅ Dodano komentarz ostrzegawczy + zmieniono response message
- [x] **#3 – `createClaimCode()` używa `Math.random()` zamiast `crypto.randomInt()`** – ✅ Zmieniono na `crypto.randomInt(100000, 1000000)`
- [x] **#4 – `base.css` deklaruje fonty `Inter` + `Playfair Display`, które NIE SĄ ładowane w HTML** – ✅ Zmieniono na `Montserrat` + `Cormorant Garamond`
- [ ] **#5 – Dwa niezależne systemy tokenów CSS koegzystują** – ⏳ Odłożone: wymaga visual testing. Szczegóły w `what_missing_copilot.md`
- [x] **#6 – Brak favicon** – ✅ Dodano `<link rel="icon">` do wszystkich 20 HTML + page generator
- [ ] **#7 – CSP zawiera `'unsafe-inline'` dla scriptów** – ⏳ Odłożone: wymaga nonce per-request + testów E2E
- [x] **#8 – `safeCompare()` w auth.js – wczesny exit przy różnych długościach** – ✅ Zmieniono na HMAC-SHA256 constant-time comparison

---

## 🟠 P1 – WYSOKIE (Refaktor / Architektura)

- [ ] **#9 – `multer 1.x` z deprecation warnings** – ⏳ Odłożone: breaking changes wymagają testów uploadu
- [ ] **#10 – `manager-dashboard.js` – 2087 linii w jednym pliku** – ⏳ Odłożone: wymaga visual testing
- [x] **#11 – `routes/manager.js` – 1151 → 568 linii** – ✅ Wyekstrahowano `quote-routes.js` (215 linii) i `project-routes.js` (494 linii)
- [ ] **#12 – `styles/base.css` – 5618 linii** – ⏳ Odłożone: wymaga visual testing
- [x] **#13 – Zduplikowana logika SMTP transporter** – ✅ Wyekstrahowano do `utils/mailer.js`
- [ ] **#14 – Duplikacja nagłówka `<header>` w każdym pliku HTML** – ⏳ Odłożone: decyzja architektoniczna
- [ ] **#15 – JWT 7d bez mechanizmu revoke** – ⏳ Odłożone: wymaga nowego modelu DB
- [x] **#16 – Usunąć zbędną zależność `cookie-parser`** – ✅ Usunięto (patrz #1)
- [x] **#17 – Brak `rel="noopener noreferrer"` na linkach zewnętrznych** – ✅ Audit: brak anchor `<a>` z external href (tylko resource links)

---

## 🟡 P2 – ŚREDNIE (Cleanup / SEO / Performance)

### Zbędne pliki i katalogi do usunięcia

- [x] **#18 – `styles.css` w korzeniu** – ✅ Usunięto
- [ ] **#19 – Pliki graficzne w korzeniu repo** – ⏳ Odłożone: wymaga aktualizacji wielu referencji
- [x] **#20 – Katalog `backup/logos/`** – ✅ Usunięto
- [ ] **#21 – Katalog `design/` z plikami wizytówek** – ⏳ Odłożone: decyzja czy zachować
- [x] **#22 – Katalog `code/dev_plan/`** – ✅ Usunięto
- [x] **#23 – Katalog `iteBuilding-Company/`** – ✅ Usunięto
- [x] **#24 – Katalog `.anima/`** – ✅ Usunięto
- [ ] **#25 – `DESIGNER_BRIEF_LEVELLINES.md`** – ⏳ Odłożone: decyzja o wrażliwości dokumentu
- [x] **#26 – `todos.md` i `dev_plan.md` (małe litery)** – ✅ Usunięto duplikaty
- [ ] **#27 – `asset-manifest.js` trackerowany w git** – ⏳ Odłożone: zależy od strategii build/deploy
- [ ] **#28 – `Gallery/premium/` (41MB) w git** – ⏳ Odłożone: wymaga CDN setup

### SEO / Performance

- [x] **#29 – Brak `<link rel="preload">` dla kluczowych obrazów LCP** – ✅ Dodano preload title.avif do 17 public pages + generator
- [ ] **#30 – `og:type="website"` na wszystkich stronach** – ⏳ Odłożone: wymaga decyzji o specific types
- [ ] **#31 – Brak `ImageObject` w JSON-LD galerii** – ⏳ Odłożone
- [ ] **#32 – Canonical URL-e z `.html` rozszerzeniami** – ⏳ Odłożone: wymaga Nginx config
- [ ] **#33 – CSS cache `max-age=86400` bez content hash** – ⏳ Odłożone: wymaga build pipeline
- [x] **#34 – `robots.txt` zezwala na wszystko (`Allow: /`)** – ✅ Dodano Disallow dla /api/, /uploads/, dashboards
- [x] **#35 – `<html lang="en">` zamiast `<html lang="en-GB">`** – ✅ Zmieniono w 20 HTML + page generator

### Architektura

- [ ] **#36 – Dwa systemy API: v1 (`/api/*`) + v2 (`/api/v2/*`) bez polityki deprecacji** – ⏳ Odłożone: wymaga planu
- [x] **#37 – Dwa health check endpointy: `/healthz` i `/api/v2/health`** – ✅ Udokumentowane: `/healthz` to process-level, `/api/v2/health` to API-level; oba mają różne cele
- [x] **#38 – `process.env.PORT` nie waliduje poprawności** – ✅ Dodano walidację zakresu 1-65535
- [ ] **#39 – `Gallery/` główna: 19 surowych zdjęć z telefonu (1–5MB, nazwy `IMG_*`)** – ⏳ Odłożone: wymaga sharp pipeline na serwerze

---

## 🔵 P3 – NISKIE (Długoterminowe / Nice-to-have)

### Mobile / App Readiness

- [ ] **#40 – `apps/web-v2` (React/Vite) nie jest zintegrowany z serwerem Express** – ⏳ Odłożone
- [ ] **#41 – `apps/mobile-v1` (React Native/Expo) – skeleton bez `npm install`** – ⏳ Odłożone
- [ ] **#42 – `DevicePushToken` zaimplementowany w modelu ale brak logiki wysyłania pushów** – ⏳ Odłożone

### CI/CD i Testing

- [ ] **#43 – Brak CI/CD pipeline** – ⏳ Odłożone: wymaga GitHub Actions setup
- [ ] **#44 – `scripts/sonar-export.sh` bez skonfigurowanego SonarQube** – ⏳ Odłożone
- [ ] **#45 – `ACCESS_TOKEN_EXPIRES_IN` / `REFRESH_TOKEN_EXPIRES_DAYS` w `.env.example`** – ⏳ Odłożone

### Dokumentacja / Plany

- [ ] **#46 – 11 planów w `Plans/` + `Project_todos.md` + `Project_Dev_plan.md` commitowane do repo** – ⏳ Odłożone
- [ ] **#47 – Kontynuować split `manager-dashboard.js`** – ⏳ Odłożone
- [ ] **#48 – Kontynuować split `client-dashboard.js`** – ⏳ Odłożone
- [ ] **#49 – Kontynuować redukcję `apps/mobile-v1/App.js`** – ⏳ Odłożone

---

## 📊 Podsumowanie

| Priorytet | Wykonane | Odłożone | Uwagi |
|---|---|---|---|
| 🔴 P0 – Krytyczne | 6/8 | 2 | CSP nonce + CSS tokens wymagają live env |
| 🟠 P1 – Wysokie | 5/9 | 4 | multer, JWT, dashboard split, HTML templating |
| 🟡 P2 – Średnie | 10/22 | 12 | CDN, Nginx, build pipeline items odłożone |
| 🔵 P3 – Niskie | 0/10 | 10 | Wszystkie wymagają infrastruktury |
| **Łącznie** | **21/49** | **28** | Szczegóły w `what_missing_copilot.md` |
