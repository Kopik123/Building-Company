# Building Company
strona firmy budowlanej

<<<<<<< HEAD
## Uruchomienie lokalnie

1. Zainstaluj zależności:
	npm install
2. Skopiuj konfigurację:
	cp .env.example .env
3. Uzupełnij dane SMTP w `.env`.
4. Uruchom serwer:
	npm start

Serwis będzie dostępny pod `http://localhost:3000`.

## Formularz e-mail

- Frontend wysyła formularz do `POST /api/contact`.
- Backend wysyła wiadomość przez SMTP (konfiguracja w `.env`).
- Wymagane zmienne: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `CONTACT_TO`.

## Galeria

- `GET /api/gallery` zwraca listę zdjęć z folderu `Gallery`.
- Zdjęcia są sortowane od najnowszych do najstarszych po dacie w nazwie pliku (`IMG_YYYYMMDD_...`).

## Wdrożenie na DigitalOcean Droplet (PM2 + Nginx + SSL)

### 1) Przygotuj serwer

1. Zaloguj się na Droplet przez SSH.
2. Zainstaluj wymagane pakiety:

	apt update
	apt install -y nodejs npm nginx certbot python3-certbot-nginx
	npm install -g pm2

3. (Opcjonalnie) uruchom helper z repo:

	bash deploy/setup-droplet.sh /var/www/building-company

### 2) Wgraj aplikację

1. Sklonuj repo do katalogu aplikacji, np. `/var/www/building-company`.
2. Przejdź do katalogu i zainstaluj zależności:

	cd /var/www/building-company
	npm ci

### 3) Ustaw konfigurację `.env`

1. Utwórz plik:

	cp .env.example .env

2. Uzupełnij minimum:

	- `NODE_ENV=production`
	- `PORT=3000`
	- `APP_URL=https://twoja-domena.pl`
	- `DATABASE_URL=...`
	- `JWT_SECRET=...` (długi, losowy sekret)
	- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`
	- `CONTACT_TO`, opcjonalnie `CONTACT_FROM`

### 4) Uruchom aplikację przez PM2

1. Start:

	pm2 start ecosystem.config.js --env production

2. Zapis autostartu po restarcie serwera:

	pm2 save
	pm2 startup systemd -u $USER --hp $HOME

3. Podgląd logów:

	pm2 logs building-company

### 5) Skonfiguruj Nginx reverse proxy

1. Skopiuj gotowy plik:

	sudo cp deploy/nginx/building-company.conf /etc/nginx/sites-available/building-company

2. Edytuj `server_name` w pliku na swoją domenę.
3. Włącz konfigurację:

	sudo ln -s /etc/nginx/sites-available/building-company /etc/nginx/sites-enabled/building-company
	sudo nginx -t
	sudo systemctl reload nginx

### 6) Dodaj HTTPS (Let's Encrypt)

	sudo certbot --nginx -d twoja-domena.pl -d www.twoja-domena.pl

Po tej komendzie Nginx zostanie automatycznie zaktualizowany o certyfikat SSL.

### 7) Firewall

	sudo ufw allow OpenSSH
	sudo ufw allow 'Nginx Full'
	sudo ufw enable

### 8) Test końcowy

1. Sprawdź aplikację:

	curl -I https://twoja-domena.pl
	curl https://twoja-domena.pl/api/gallery

2. Jeśli endpointy działają i strona się otwiera, wdrożenie jest gotowe.

### Aktualizacja aplikacji po zmianach

	cd /var/www/building-company
	git pull
	npm ci
	pm2 restart building-company

=======
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
	-d '{"guestEmail":"jan@example.com"}'

curl -sS -X POST http://localhost:3000/api/quotes/guest/<QUOTE_ID>/claim/confirm \
	-H 'Authorization: Bearer <JWT_TOKEN>' \
	-H 'Content-Type: application/json' \
	-d '{"claimToken":"<CLAIM_TOKEN>","claimCode":"123456"}'
```

### 5) Local inbox (zalogowani użytkownicy)

```bash
curl -sS -X POST http://localhost:3000/api/inbox/threads \
	-H 'Authorization: Bearer <JWT_TOKEN>' \
	-H 'Content-Type: application/json' \
	-d '{"recipientUserId":"<USER_ID>","subject":"Nowy temat","body":"Pierwsza wiadomość"}'

curl -sS http://localhost:3000/api/inbox/threads \
	-H 'Authorization: Bearer <JWT_TOKEN>'
```
>>>>>>> d02f614 (email)
