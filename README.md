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

## Wdrożenie na DigitalOcean (PM2 + Nginx + SSL)

### Wymagania wstępne

- Droplet Ubuntu 22.04 lub 24.04 (min. 1 GB RAM)
- Domena z rekordem DNS **A** wskazującym na IP Dropletu
- Dostęp SSH do Dropletu (klucz lub hasło root)

---

### Krok 1 – Utwórz Droplet

1. Zaloguj się do [cloud.digitalocean.com](https://cloud.digitalocean.com).
2. Kliknij **Create → Droplets**.
3. Wybierz obraz: **Ubuntu 22.04 LTS** lub **24.04 LTS**.
4. Wybierz plan (min. **1 GB RAM / 1 vCPU**).
5. Dodaj klucz SSH (zalecane) lub ustaw hasło root.
6. Kliknij **Create Droplet** i poczekaj na uruchomienie.

---

### Krok 2 – Zaloguj się przez SSH

```bash
ssh root@<IP_DROPLETU>
```

> Zastąp `<IP_DROPLETU>` adresem IP widocznym w panelu DigitalOcean.

---

### Krok 3 – Sklonuj repozytorium

```bash
git clone https://github.com/Kopik123/Building-Company.git /var/www/building-company
```

---

### Krok 4 – Uruchom skrypt konfiguracyjny

```bash
bash /var/www/building-company/deploy/setup-droplet.sh /var/www/building-company twoja-domena.pl
```

> Zastąp `twoja-domena.pl` swoją domeną.

Skrypt wykona automatycznie:
- instalację Node.js LTS v22,
- instalację i konfigurację PostgreSQL,
- instalację PM2 (process manager) i serwisu systemd,
- instalację Nginx (reverse proxy),
- instalację zależności npm,
- wygenerowanie i zapisanie do `.env` losowych wartości `DATABASE_URL`, `JWT_SECRET` i `BOOTSTRAP_ADMIN_KEY`.

Na końcu skrypt wydrukuje wygenerowany `BOOTSTRAP_ADMIN_KEY` – **zapisz go** przed zamknięciem terminala.

---

### Krok 5 – Skonfiguruj SMTP (formularz kontaktowy)

Otwórz plik `.env`:

```bash
nano /var/www/building-company/.env
```

Uzupełnij dane SMTP swojego dostawcy poczty (np. Mailgun, Brevo, Gmail SMTP):

| Zmienna | Przykład |
|---|---|
| `SMTP_HOST` | `smtp.mailgun.org` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | `postmaster@twoja-domena.pl` |
| `SMTP_PASS` | `haslo-smtp` |
| `CONTACT_TO` | `info@twoja-domena.pl` |

Zmienne `DATABASE_URL`, `JWT_SECRET` i `BOOTSTRAP_ADMIN_KEY` są już wypełnione automatycznie – **nie zmieniaj ich**.

Zapisz plik (`Ctrl+O`, `Enter`, `Ctrl+X`) i zrestartuj aplikację:

```bash
pm2 restart building-company
```

---

### Krok 6 – Włącz SSL (Let's Encrypt)

> Upewnij się, że rekord DNS domeny wskazuje już na IP Dropletu (może być potrzebny czas propagacji).

```bash
sudo certbot --nginx -d twoja-domena.pl -d www.twoja-domena.pl
```

Certbot automatycznie uzupełni konfigurację Nginx i doda przekierowanie HTTP → HTTPS.

---

### Krok 7 – Utwórz konto administratora

Użyj `BOOTSTRAP_ADMIN_KEY` wydrukowanego przez skrypt w Kroku 4:

```bash
curl -sS -X POST https://twoja-domena.pl/api/auth/bootstrap/staff \
  -H 'Content-Type: application/json' \
  -H 'x-bootstrap-key: <BOOTSTRAP_ADMIN_KEY>' \
  -d '{"email":"admin@twoja-domena.pl","password":"silne-haslo","name":"Admin","role":"admin"}'
```

> Po pierwszym udanym wywołaniu endpoint bootstrap jest automatycznie blokowany (zwraca `403`).

---

### Krok 8 – Sprawdź działanie

Otwórz przeglądarkę i wejdź na `https://twoja-domena.pl`. Serwer API jest dostępny pod `https://twoja-domena.pl/api/`.

---

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
tail -f /var/www/building-company/logs/pm2-error.log
```
