# Building Company
strona firmy budowlanej

## Uruchomienie lokalnie

1. Zainstaluj zależności:

	npm install

2. Skopiuj konfigurację:

	cp .env.example .env

3. Uzupełnij `.env` (minimum):

	- `DATABASE_URL`
	- `JWT_SECRET`
	- `BOOTSTRAP_ADMIN_KEY`

4. Uruchom serwer:

	npm start

Serwis będzie dostępny pod `http://localhost:3000`.

## Formularz e-mail i galeria

- Frontend wysyła formularz kontaktowy do `POST /api/contact`.
- Backend wysyła wiadomość przez SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `CONTACT_TO`).
- `GET /api/gallery` zwraca listę zdjęć z folderu `Gallery` (sortowanie po dacie z nazwy pliku).

## API testy (curl)

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

## Wdrożenie na DigitalOcean Droplet (PM2 + Nginx + SSL)

### Jak dodać repo do DigitalOcean

1. W panelu DigitalOcean utwórz Droplet (Ubuntu 22.04/24.04).
2. Zaloguj się przez SSH na serwer.
3. Sklonuj repo do katalogu aplikacji:

```bash
git clone https://github.com/Kopik123/Building-Company.git /var/www/building-company
```

4. Uruchom konfigurację z tego repo:

```bash
bash /var/www/building-company/deploy/setup-droplet.sh /var/www/building-company example.com
```

### Wymagania

- Ubuntu 22.04 lub 24.04 Droplet (min. 1 GB RAM)
- Domena DNS wskazująca na IP Dropletu

### Automatyczna instalacja

Sklonuj repozytorium na Droplet, a następnie uruchom skrypt konfiguracyjny:

```bash
git clone https://github.com/Kopik123/Building-Company.git /var/www/building-company
bash /var/www/building-company/deploy/setup-droplet.sh /var/www/building-company example.com
```

Skrypt wykona automatycznie:
- instalację Node.js LTS (v22 przez NodeSource),
- instalację i konfigurację PostgreSQL (baza `building_company`, użytkownik `buildingco`),
- instalację PM2 i rejestrację serwisu systemd,
- instalację Nginx i skopiowanie konfiguracji reverse proxy,
- instalację zależności npm (`npm ci --omit=dev`),
- skopiowanie `.env.example` → `.env` z wstępnie wygenerowanym hasłem do bazy.

### Konfiguracja środowiska

Po wykonaniu skryptu uzupełnij plik `.env`:

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

Następnie zrestartuj aplikację:

```bash
pm2 restart building-company
```

### SSL (Let's Encrypt)

```bash
sudo certbot --nginx -d example.com -d www.example.com
```

Certbot automatycznie uzupełni konfigurację Nginx i doda przekierowanie HTTP → HTTPS.

### Aktualizacja aplikacji

```bash
cd /var/www/building-company
git pull
npm ci --omit=dev
pm2 restart building-company
```

### Logi i monitoring

```bash
pm2 logs building-company        # live tail
pm2 monit                         # dashboard CPU/RAM
tail -f logs/pm2-error.log        # error log
```
