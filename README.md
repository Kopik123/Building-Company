# Building Company
strona firmy budowlanej

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
