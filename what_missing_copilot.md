# Co Brakuje – Zadania Wymagające Środowiska Produkcyjnego / Zewnętrznych Narzędzi

> Wygenerowano: 2026-03-30
> Powód: Te zadania nie mogą być wykonane w środowisku sandbox – wymagają serwera produkcyjnego, bazy danych, CI/CD, lub decyzji architektonicznych.

---

## 🔒 Security – Wymaga Live Environment

- [ ] **#7 – CSP nonce zamiast `'unsafe-inline'`** – Wymaga wdrożenia per-request nonce w Express + aktualizacji wszystkich inline scripts. Ryzykowne bez testów E2E na żywo.
- [ ] **#15 – JWT token revoke / blacklist** – Wymaga nowego modelu DB (`TokenBlacklist`), middleware, i migracji. Duża zmiana architektoniczna.
- [ ] **#9 – Migracja `multer 1.x` → `2.x`** – Breaking API changes; wymaga testów uploadu plików na działającym serwerze.

---

## 🖥️ Deployment / DevOps

- [ ] **PM2 restart z `--update-env`** – Po deploy wymagany `pm2 restart ecosystem.config.js --update-env`
- [ ] **Nginx config update** – Sprawdzić upstream `127.0.0.1:3000`, dodać AVIF do static cache, canonical URLs bez `.html`
- [ ] **#32 – Canonical URLs bez `.html`** – Wymaga Nginx rewrite rules na serwerze
- [ ] **#33 – CSS cache busting z content hash** – Wymaga build pipeline'u (np. esbuild/webpack) lub konfiguracji Nginx
- [ ] **#28 – `Gallery/premium/` na CDN** – Wymaga setup CDN/Object Storage (np. DigitalOcean Spaces)
- [ ] **#39 – Optymalizacja `Gallery/` (surowe zdjęcia)** – Wymaga `sharp` pipeline na działającym systemie z plikami źródłowymi

---

## 🧪 Testing – Wymaga Environment

- [ ] **#43 – CI/CD pipeline** – Wymaga konfiguracji GitHub Actions z secrets (DB, env vars)
- [ ] **Playwright E2E testy** – Blokowane przez `spawn EPERM` na stacji roboczej; potrzebna maszyna z Playwright browsers
- [ ] **Live QA desktop/mobile** – Wymaga deploy i `deploy/LIVE_QA_CHECKLIST_PC_MOBILE.md` weryfikacji
- [ ] **#44 – SonarQube export** – Wymaga `SONAR_URL` i `SONAR_TOKEN` na działającej instancji SonarQube
- [ ] **Weryfikacja inline login strip** – Wymaga sesji auth na żywo po deploy

---

## 📱 Mobile / App

- [ ] **#40 – `apps/web-v2` integracja z Express** – Vite dev proxy + `dist/` serving wymaga decyzji architektonicznej
- [ ] **#41 – `apps/mobile-v1` setup** – React Native/Expo skeleton wymaga `npm install` i konfiguracji
- [ ] **#42 – Push notifications** – `DevicePushToken` model istnieje, ale brak logiki wysyłania (Expo/FCM setup)
- [ ] **#49 – Kontynuacja redukcji `apps/mobile-v1/App.js`** – Stabilizacja po ekstrakcji screens.js/styles.js

---

## 🏗️ Architektura – Wymaga Decyzji

- [ ] **#36 – Polityka deprecacji API v1 vs v2** – Wymaga planu wygaszania v1 endpointów
- [ ] **#14 – HTML templating (partials/SSI)** – Duża decyzja architektoniczna: EJS/Nunjucks/SSI/build step?
- [ ] **#10 – Split `manager-dashboard.js` (2087 linii)** – Duży refaktor JS, wymaga visual testing
- [ ] **#47/#48 – Split `client-dashboard.js`** – Jak wyżej
- [ ] **#46 – Przeniesienie planów do GitHub Wiki/Notion** – Decyzja organizacyjna
- [ ] **#25 – `DESIGNER_BRIEF_LEVELLINES.md` w publicznym repo** – Decyzja: usunąć czy przenieść do prywatnego?
- [ ] **#27 – `asset-manifest.js` w git** – Zależy od strategii build/deploy (generować na deploy czy trzymać w repo?)
- [ ] **#19 – Przeniesienie plików graficznych z korzenia do `assets/`** – Wymaga aktualizacji wszystkich referencji w HTML/CSS/JS

---

## 📋 Live Verification Items (z Project_todos.md)

- [ ] Run `powershell -ExecutionPolicy Bypass -File .\scripts\setup-vscode.ps1` na lokalnej maszynie
- [ ] Re-check `title.png` shell na live desktop i mobile po deploy
- [ ] Re-check slimmer top bar i login/menu strip na live
- [ ] Verify inline login strip state na wszystkich public pages
- [ ] Run live QA checklist z `deploy/LIVE_QA_CHECKLIST_PC_MOBILE.md`
- [ ] Decide o `header.png` – czy zachować jako historical asset
- [ ] Re-run `npm run test:e2e:mobile` na maszynie z Playwright

---

## 📊 Podsumowanie

| Kategoria | Ilość zadań |
|---|---|
| Security (live env) | 3 |
| Deployment/DevOps | 6 |
| Testing | 5 |
| Mobile/App | 4 |
| Architektura (decyzje) | 8 |
| Live Verification | 7 |
| **Łącznie odłożone** | **33** |

> Wszystkie te zadania zostały odłożone świadomie – nie dlatego że są niewykonalne, ale dlatego że sandbox bez bazy danych, serwera i CI/CD nie pozwala ich bezpiecznie wdrożyć.
