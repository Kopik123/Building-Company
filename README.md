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

1. Przygotuj serwer (`apt`, `nginx`, `certbot`, `pm2`).
2. Wgraj aplikację i wykonaj `npm ci`.
3. Skonfiguruj `.env` dla produkcji (`NODE_ENV=production`, `APP_URL`, SMTP itd.).
4. Uruchom przez PM2: `pm2 start ecosystem.config.js --env production`.
5. Skonfiguruj reverse proxy Nginx i SSL przez certbot.
6. Po zmianach: `git pull && npm ci && pm2 restart building-company`.
