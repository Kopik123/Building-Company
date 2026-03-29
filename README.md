# Building Company
strona firmy budowlanej

## Dokumentacja systemu

- [Docs/Level Lines - System Overview.md](Docs/Level%20Lines%20-%20System%20Overview.md)
- [Docs/Level Lines - Mapa Strony I Ekranow.md](Docs/Level%20Lines%20-%20Mapa%20Strony%20I%20Ekranow.md)
- [Docs/Level Lines - Architektura Techniczna.md](Docs/Level%20Lines%20-%20Architektura%20Techniczna.md)

## API v2 / Web v2 / Mobile v1

- API v2 routes: `api/v2/*`
- Web v2 app scaffold: `apps/web-v2`
- Mobile v1 app scaffold: `apps/mobile-v1`
- Cutover checklist: `deploy/CUTOVER_CHECKLIST_STAGING_PROD_v2.md`

### Authenticated web direction

- `apps/web-v2` is the canonical authenticated web app for new product work.
- `auth.html`, `client-dashboard.html`, and `manager-dashboard.html` remain online only as compatibility entry shells during controlled cutover.
- New authenticated features should be implemented in `apps/web-v2` first unless the task is explicitly legacy-only or cutover-critical.
- When a legacy page still needs a change, prefer the smallest compatibility-only patch and keep the real domain/API ownership portable for future `web-v2` and Android/iOS clients.

### Test commands

```bash
npm run verify:generated
npm run test:ci
npm run test:api:v2
npm run test:e2e:mobile
npm run test:all
```

### Windows PowerShell 5.1

- Use `npm.cmd` instead of `npm` in local PowerShell 5.1.
- Do not use Bash-style `&&` directly in PowerShell 5.1; use multi-line fail-fast checks or `cmd /c`.
- Canonical local examples live in [deploy/WINDOWS_POWERSHELL_5_1_LOCAL_COMMANDS.md](deploy/WINDOWS_POWERSHELL_5_1_LOCAL_COMMANDS.md).

Example:

```powershell
npm.cmd run verify:generated
if ($LASTEXITCODE -ne 0) { exit 1 }

npm.cmd run test:ci
if ($LASTEXITCODE -ne 0) { exit 1 }
```

### Generowane strony publiczne

```bash
npm run generate:locations
npm run generate:services
npm run generate:public-pages:content
npm run generate:public-pages
```

- `npm run verify:generated` sprawdza, czy wygenerowane pliki HTML są zgodne z danymi w `scripts/*.data.js`.
- `npm run test:ci` uruchamia pełny lekki gate repo: `verify:generated` oraz `test:api:v2`.
- `npm run generate:public-pages:content` przebudowuje tylko generowane HTML-e.
- `npm run generate:public-pages` uruchamia pełny pipeline: optymalizacja assetów + generowane HTML-e.

## Uruchomienie lokalnie

1. Zainstaluj zależności:

	npm install

2. Skopiuj konfigurację:

	cp .env.example .env

3. Uzupełnij `.env` (minimum):

	- `DATABASE_URL`
	- `JWT_SECRET`
	- `BOOTSTRAP_ADMIN_KEY`
	- opcjonalnie `HOST`:
	  - lokalnie / PM2 na serwerze: `127.0.0.1`
	  - Docker / kontenery: `0.0.0.0`

4. Przygotuj bazę przed startem aplikacji:

	npm run migrate
	npm run ensure:indexes

5. Uruchom serwer:

	npm start

Serwis będzie dostępny pod `http://127.0.0.1:3000` gdy `HOST=127.0.0.1`.

Szybki health check procesu HTTP:

```bash
curl -sS http://127.0.0.1:3000/healthz
```

## Migracje bazy (Umzug)

Migracje nie uruchamiają się już automatycznie przy starcie aplikacji. Repo używa teraz jawnego flow deploy/start:

- `npm run migrate`
- opcjonalnie `npm run ensure:indexes`
- dopiero potem `npm start` albo `pm2 restart ...`

Ręcznie:

```bash
npm run migrate
npm run migrate:status
npm run ensure:indexes
```

- Skrypty migracji wymagają `DATABASE_URL`.
- Dla wygody lokalnej możesz ustawić `DEV_DATABASE_URL`; `scripts/migrate.js` użyje go tylko jako CLI fallback, jeśli `DATABASE_URL` nie jest ustawione w bieżącym shellu.
- Runtime aplikacji nadal wymaga normalnego `DATABASE_URL`.
- `npm run ensure:indexes` używa tego samego preflight/fallback co migracje, ale pozostaje osobnym krokiem CLI zamiast ukrytego startup sync.

## Lokalny Postgres / Compose bootstrap

Repo ma teraz jawny lokalny bootstrap dla Postgresa pod `deploy/docker-compose.local-db.yml`.

Szybki start:

```bash
docker compose -f deploy/docker-compose.local-db.yml up -d
```

Następnie ustaw lokalnie:

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/building_company_dev
```

albo tylko CLI fallback:

```bash
DEV_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/building_company_dev
```

Pełny opis jest w `deploy/LOCAL_POSTGRES_COMPOSE_BOOTSTRAP.md`.

## Formularz e-mail i galeria

- Frontend wysyła formularz kontaktowy do `POST /api/contact`.
- Backend wysyła wiadomość przez SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `CONTACT_TO`).
- `GET /api/gallery` zwraca listę zdjęć z folderu `Gallery` (sortowanie po dacie z nazwy pliku).

## API testy (curl)

### 0) Health checks

```bash
curl -sS http://127.0.0.1:3000/healthz
curl -sS http://127.0.0.1:3000/api/v2/health
```

### 1) Guest quote bez logowania

```bash
curl -sS -X POST http://localhost:3000/api/quotes/guest \
	-H 'Content-Type: application/json' \
	-d '{
		"guestName":"Jan Test",
		"guestEmail":"jan@example.com",
		"guestPhone":"+447700900000",
		"postcode":"M1 1AA",
		"projectType":"bathroom",
		"location":"Manchester",
		"budgetRange":"£10,000–£25,000",
		"description":"Guest quote test"
	}'
```

### 2) Podgląd statusu guest quote (po tokenie)

```bash
curl -sS http://localhost:3000/api/quotes/guest/<PUBLIC_TOKEN>
```

### 3) Rejestracja i login (token JWT)

```bash
curl -sS -X POST http://localhost:3000/api/auth/register \
	-H 'Content-Type: application/json' \
	-d '{"email":"client@example.com","password":"secret123","name":"Client User"}'

curl -sS -X POST http://localhost:3000/api/auth/login \
	-H 'Content-Type: application/json' \
	-d '{"email":"client@example.com","password":"secret123"}'
```

### 4) Claim request + confirm guest quote

```bash
curl -sS -X POST http://localhost:3000/api/quotes/guest/<QUOTE_ID>/claim/request \
	-H 'Content-Type: application/json' \
	-d '{"channel":"email","guestEmail":"jan@example.com"}'

curl -sS -X POST http://localhost:3000/api/quotes/guest/<QUOTE_ID>/claim/request \
	-H 'Content-Type: application/json' \
	-d '{"channel":"phone","guestPhone":"+447700900000"}'

curl -sS -X POST http://localhost:3000/api/quotes/guest/<QUOTE_ID>/claim/confirm \
	-H 'Authorization: Bearer <JWT_TOKEN>' \
	-H 'Content-Type: application/json' \
	-d '{"claimToken":"<CLAIM_TOKEN>","claimCode":"123456"}'
```

Uwaga: endpoint `claim/request` nie zwraca `claimCode`. Kod jest dostarczany kanałem `email` albo `phone`.

### 5) Local inbox (zalogowani użytkownicy)

```bash
curl -sS -X POST http://localhost:3000/api/inbox/threads \
	-H 'Authorization: Bearer <JWT_TOKEN>' \
	-H 'Content-Type: application/json' \
	-d '{"recipientUserId":"<USER_ID>","subject":"Nowy temat","body":"Pierwsza wiadomość"}'

curl -sS http://localhost:3000/api/inbox/threads \
	-H 'Authorization: Bearer <JWT_TOKEN>'
```

### 6) Manager API (manager/admin)

```bash
curl -sS "http://localhost:3000/api/manager/quotes?status=pending" \
	-H 'Authorization: Bearer <MANAGER_JWT_TOKEN>'

curl -sS -X PATCH http://localhost:3000/api/manager/quotes/<QUOTE_ID> \
	-H 'Authorization: Bearer <MANAGER_JWT_TOKEN>' \
	-H 'Content-Type: application/json' \
	-d '{"status":"in_progress","priority":"high"}'
```

### 6a) Project / gallery management API (employee/manager/admin)

```bash
curl -sS http://localhost:3000/api/manager/projects?includeMedia=true \
	-H 'Authorization: Bearer <STAFF_JWT_TOKEN>'

curl -sS "http://localhost:3000/api/manager/projects?includeMedia=true&page=1&pageSize=25&status=in_progress&q=didsbury" \
	-H 'Authorization: Bearer <STAFF_JWT_TOKEN>'

curl -sS -X POST http://localhost:3000/api/manager/projects \
	-H 'Authorization: Bearer <STAFF_JWT_TOKEN>' \
	-H 'Content-Type: application/json' \
	-d '{"title":"Didsbury Bathroom 2026","location":"Didsbury","status":"in_progress","showInGallery":true,"galleryOrder":1,"clientEmail":"client@example.com","assignedManagerEmail":"manager@example.com"}'

curl -sS -X POST http://localhost:3000/api/manager/projects/<PROJECT_ID>/media/upload \
	-H 'Authorization: Bearer <STAFF_JWT_TOKEN>' \
	-F "files=@/path/photo1.jpg" \
	-F "files=@/path/spec.pdf" \
	-F "showInGallery=true"

curl -sS "http://localhost:3000/api/manager/clients/search?email=client@example.com" \
	-H 'Authorization: Bearer <STAFF_JWT_TOKEN>'

curl -sS "http://localhost:3000/api/manager/staff/search?email=manager@example.com" \
	-H 'Authorization: Bearer <STAFF_JWT_TOKEN>'
```

Public gallery data now supports managed project/image selection:

```bash
curl -sS http://localhost:3000/api/gallery/projects
```

### 6b) Services + materials management API (employee/manager/admin)

```bash
curl -sS http://localhost:3000/api/manager/services \
	-H 'Authorization: Bearer <STAFF_JWT_TOKEN>'

curl -sS "http://localhost:3000/api/manager/services?page=1&pageSize=25&q=bathroom&showOnWebsite=true" \
	-H 'Authorization: Bearer <STAFF_JWT_TOKEN>'

curl -sS -X POST http://localhost:3000/api/manager/services \
	-H 'Authorization: Bearer <STAFF_JWT_TOKEN>' \
	-H 'Content-Type: application/json' \
	-d '{"title":"Premium Bathroom Renovation","category":"bathroom","showOnWebsite":true,"displayOrder":1}'

curl -sS http://localhost:3000/api/manager/materials \
	-H 'Authorization: Bearer <STAFF_JWT_TOKEN>'

curl -sS "http://localhost:3000/api/manager/materials?page=1&pageSize=25&lowStock=true&q=tile" \
	-H 'Authorization: Bearer <STAFF_JWT_TOKEN>'
```

### 6d) Starter seed (manager/admin)

```bash
curl -sS -X POST http://localhost:3000/api/manager/seed/starter \
	-H 'Authorization: Bearer <MANAGER_JWT_TOKEN>' \
	-H 'Content-Type: application/json' \
	-d '{"force":false}'
```

### 6c) Client portal API (client role)

```bash
curl -sS http://localhost:3000/api/client/overview \
	-H 'Authorization: Bearer <CLIENT_JWT_TOKEN>'

curl -sS -X POST http://localhost:3000/api/client/projects/<PROJECT_ID>/documents/upload \
	-H 'Authorization: Bearer <CLIENT_JWT_TOKEN>' \
	-F "files=@/path/to/document.pdf" \
	-F "caption=Invoice"
```

Public services endpoint used by the website:

```bash
curl -sS http://localhost:3000/api/services
```

### 7) Bootstrap konta manager/admin

```bash
curl -sS -X POST http://localhost:3000/api/auth/bootstrap/staff \
	-H 'Content-Type: application/json' \
	-H 'x-bootstrap-key: <BOOTSTRAP_ADMIN_KEY>' \
	-d '{"email":"manager@example.com","password":"secret1234","name":"Manager User","role":"manager"}'

curl -sS -X POST http://localhost:3000/api/auth/bootstrap/staff \
	-H 'Content-Type: application/json' \
	-H 'x-bootstrap-key: <BOOTSTRAP_ADMIN_KEY>' \
	-d '{"email":"admin@example.com","password":"secret1234","name":"Admin User","role":"admin"}'
```

Uwaga: tworzenie `admin` jest jednorazowe (`409` przy kolejnej próbie).
Endpoint bootstrap jest automatycznie wygaszany po pierwszym udanym utworzeniu konta staff (`manager` lub `admin`).
Po wygaszeniu kolejne wywołania zwracają `403`.

Aby włączyć bootstrap ponownie lokalnie:

- ustaw `BOOTSTRAP_ENABLED=true`
- usuń plik `.bootstrap.lock` z katalogu projektu

### 8) Rotacja `BOOTSTRAP_ADMIN_KEY` bez restartu (tylko admin)

```bash
curl -sS -X POST http://localhost:3000/api/auth/bootstrap/rotate-key \
	-H 'Authorization: Bearer <ADMIN_JWT_TOKEN>' \
	-H 'Content-Type: application/json' \
	-d '{"currentBootstrapKey":"<OLD_BOOTSTRAP_ADMIN_KEY>","newBootstrapKey":"<NEW_BOOTSTRAP_ADMIN_KEY>"}'
```

## Wymagane zmienne środowiskowe

Serwer nie uruchomi się bez:

- `DATABASE_URL`
- `JWT_SECRET`
- `BOOTSTRAP_ADMIN_KEY`

Opcjonalne:

- `BOOTSTRAP_ENABLED` (domyślnie aktywny, zablokowany gdy `false`)
- `PUBLIC_SERVICES_CACHE_TTL_MS` (cache HTTP dla `GET /api/services`, domyslnie `30000`)
- `PUBLIC_GALLERY_CACHE_TTL_MS` (cache HTTP dla `GET /api/gallery/projects`, domyslnie `30000`)

### SMTP lokalnie na DigitalOcean (localhost)

Jeżeli chcesz obsługiwać e-mail przez lokalny serwer SMTP na Droplecie:

1. Zainstaluj Postfix:

```bash
sudo apt-get update
sudo apt-get install -y postfix mailutils libsasl2-modules
```

2. Ustaw `.env` aplikacji:

```env
SMTP_HOST=127.0.0.1
SMTP_PORT=25
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
CONTACT_TO=info@levellines.co.uk
CONTACT_FROM=no-reply@levellines.co.uk
```

3. Zrestartuj aplikację:

```bash
pm2 restart ecosystem.config.js --only building-company --env production --update-env
sleep 2
curl -sS http://127.0.0.1:3000/healthz
```

Uwaga: DigitalOcean często blokuje bezpośrednie wysyłanie na port 25 do internetu dla nowych kont. W praktyce Postfix zwykle powinien działać jako lokalny relay przez zewnętrzny SMTP smart host (Mailgun/Brevo/SES).

## Wdrożenie na DigitalOcean Droplet (PM2 + Nginx + SSL)

### Krok po kroku (od zera)

1. W panelu DigitalOcean utwórz Droplet (Ubuntu 22.04/24.04, min. 1 GB RAM).
2. Skieruj domenę na IP Dropletu (rekord DNS A).
3. Zaloguj się przez SSH na serwer.
4. Sklonuj repozytorium do katalogu aplikacji:

   ```bash
   git clone https://github.com/Kopik123/Building-Company.git /var/www/building-company
   ```

5. Uruchom skrypt konfiguracji:

   ```bash
   bash /var/www/building-company/deploy/setup-droplet.sh /var/www/building-company example.com
   ```

Skrypt wykona automatycznie:
- instalację Node.js LTS (v22 przez NodeSource),
- instalację i konfigurację PostgreSQL (baza `building_company`, użytkownik `buildingco`),
- instalację PM2 i rejestrację serwisu systemd,
- instalację Nginx i skopiowanie konfiguracji reverse proxy,
- instalację zależności npm (`npm ci --omit=dev`),
- skopiowanie `.env.example` → `.env` z wstępnie wygenerowanym hasłem do bazy.

6. Po wykonaniu skryptu uzupełnij plik `.env`:

```bash
nano /var/www/building-company/.env
```

Skrypt automatycznie generuje i wstrzykuje:

| Zmienna | Jak generowana |
|---|---|
| `DATABASE_URL` | Automatycznie – losowe hasło DB podczas setup |
| `JWT_SECRET` | Automatycznie – `openssl rand -hex 32` |
| `BOOTSTRAP_ADMIN_KEY` | Automatycznie – `openssl rand -hex 24` |

Należy uzupełnić ręcznie (formularz kontaktowy):

| Zmienna | Opis |
|---|---|
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Dane SMTP (np. Mailgun, Brevo) |
| `CONTACT_TO` | Adres e-mail do odbierania formularzy |

7. Zrestartuj aplikację:

```bash
pm2 restart ecosystem.config.js --only building-company --env production --update-env
sleep 2
curl -sS http://127.0.0.1:3000/healthz
```

8. Włącz SSL (Let's Encrypt):

```bash
sudo certbot --nginx -d example.com -d www.example.com
```

Certbot automatycznie uzupełni konfigurację Nginx i doda przekierowanie HTTP → HTTPS.

## Security Baseline (DigitalOcean Production)

Po podstawowym deployu uruchom pełny baseline bezpieczeństwa:

```bash
cd /var/www/building-company
bash deploy/harden-droplet.sh
```

Skrypt automatycznie konfiguruje:
- UFW (`deny incoming`, otwarte tylko `22/80/443`),
- Fail2ban (`sshd`, `nginx-http-auth`, `nginx-botsearch`),
- automatyczne aktualizacje bezpieczeństwa (`unattended-upgrades`),
- cotygodniowe skany (`clamav`, `rkhunter`).

### Weryfikacja po hardeningu

```bash
sudo ufw status verbose
sudo fail2ban-client status
sudo systemctl status unattended-upgrades --no-pager
curl -I https://levellines.co.uk
curl -I https://www.levellines.co.uk
```

### Dodatkowe kroki rekomendowane

1. Włącz backupy DigitalOcean + snapshot tygodniowy.
2. Używaj tylko logowania SSH kluczem; wyłącz hasło po weryfikacji dostępu.
3. Ogranicz uprawnienia kont (oddzielny user deploy bez sudo do codziennej pracy).
4. Rotuj sekrety (`JWT_SECRET`, `BOOTSTRAP_ADMIN_KEY`, SMTP relay hasła) co 90 dni.
5. Monitoruj alerty certyfikatów i odnowienie certbot (`systemctl list-timers | grep certbot`).

### Gdy AV (np. Avast) zgłasza zagrożenie

1. Zweryfikuj certyfikat i redirecty HTTPS.
2. Uruchom lokalny skan:

```bash
sudo clamscan -ri /var/www/building-company --exclude-dir=node_modules
sudo rkhunter --check --skip-keypress --report-warnings-only
```

3. Sprawdź nagłówki i treść strony (`curl -I`, `view-source`).
4. Zgłoś false positive do vendorów AV (częste dla nowych domen).

### Aktualizacja aplikacji

```bash
cd /var/www/building-company
git fetch origin
git checkout vscode
git pull --ff-only origin vscode
npm ci --omit=dev
pm2 restart ecosystem.config.js --only building-company --env production --update-env
sleep 2
curl -sS http://127.0.0.1:3000/healthz
```

### Ustawienie domeny produkcyjnej (DigitalOcean)

Po pierwszym deployu możesz podmienić placeholdery SEO i `server_name` w Nginx jednym poleceniem:

```bash
cd /var/www/building-company
bash deploy/configure-domain.sh twojadomena.pl /var/www/building-company
```

Skrypt zaktualizuje:
- `index.html` i podstrony `premium-*.html` (canonical, og:url),
- `robots.txt` i `sitemap.xml`,
- `server_name` w `/etc/nginx/sites-available/building-company`.

Następnie uruchom SSL:

```bash
sudo certbot --nginx -d twojadomena.pl -d www.twojadomena.pl
```

### Logi i monitoring

```bash
pm2 logs building-company        # live tail
pm2 monit                         # dashboard CPU/RAM
tail -f logs/pm2-error.log        # error log
```