# Local Postgres / Compose Bootstrap

This repo now treats database prep as an explicit developer step instead of a hidden app-start side effect.

## 1) Start local Postgres

```bash
docker compose -f deploy/docker-compose.local-db.yml up -d
```

Default local DB:

- database: `building_company_dev`
- user: `postgres`
- password: `postgres`
- port: `5432`

## 2) Set local environment

For the full app/runtime flow:

```bash
export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/building_company_dev"
```

For CLI-only migration/index commands:

```bash
export DEV_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/building_company_dev"
```

## 3) Prepare schema explicitly

```bash
npm run migrate
npm run ensure:indexes
```

## 4) Start the app

```bash
npm start
```

## 5) Verify

```bash
curl -sS http://127.0.0.1:3000/healthz
```

## Notes

- The app no longer runs migrations automatically at boot.
- `ensure:indexes` is intentionally a separate CLI step so index ownership is explicit during local setup and deploys.
- This Compose path is the recommended lightweight local bootstrap until a broader multi-service local stack is needed.
