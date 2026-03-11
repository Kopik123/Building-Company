# Cutover Checklist: Staging -> Production (API v2)

## 1) Preconditions

- `staging` has green API tests (`npm run test:api:v2`)
- `staging` has green mobile smoke (`npm run test:e2e:mobile`)
- migrations are reviewed and ordered
- DNS, SSL and PM2 target names confirmed

## 2) Staging Deploy + Verify

```bash
set -e
APP_DIR="/var/www/building-company"
PM2_NAME="building-company-staging"
DOMAIN="staging.levellines.co.uk"

cd "$APP_DIR"
git fetch --all --prune
git checkout staging
git pull --ff-only
npm ci --omit=dev
npm run migrate
pm2 restart "$PM2_NAME" --update-env
sleep 2
pm2 save

curl -sS "https://$DOMAIN/healthz"; echo
curl -sS "https://$DOMAIN/api/v2/health"; echo
curl -sS "https://$DOMAIN/api/v2/services" | head -c 400; echo
```

## 3) Production Backup (mandatory)

```bash
set -e
APP_DIR="/var/www/building-company"
BACKUP_DIR="/var/backups/building-company"
TS="$(date +%F-%H%M%S)"
mkdir -p "$BACKUP_DIR"

cd "$APP_DIR"
PREV_SHA="$(git rev-parse HEAD)"
echo "$PREV_SHA" | tee "$BACKUP_DIR/prev-sha-$TS.txt"

pg_dump "$DATABASE_URL" -Fc -f "$BACKUP_DIR/prod-$TS.dump"
ls -lh "$BACKUP_DIR/prod-$TS.dump"
```

## 4) Production Cutover

```bash
set -e
APP_DIR="/var/www/building-company"
PM2_NAME="building-company"
DOMAIN="levellines.co.uk"

cd "$APP_DIR"
git fetch --all --prune
git checkout main
git pull --ff-only
npm ci --omit=dev
npm run migrate
pm2 restart "$PM2_NAME" --update-env
sleep 2
pm2 save

curl -sS "https://$DOMAIN/healthz"; echo
curl -sS "https://$DOMAIN/api/v2/health"; echo
curl -I "https://$DOMAIN/auth.html" | head -n 1
curl -I "https://$DOMAIN/client-dashboard.html" | head -n 1
```

## 5) Post-cutover smoke

```bash
set -e
DOMAIN="levellines.co.uk"
EMAIL="replace_with_test_user"
PASS="replace_with_test_pass"

RESP="$(curl -sS -X POST "https://$DOMAIN/api/v2/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")"

ACCESS="$(printf '%s' "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('accessToken',''))")"
curl -sS "https://$DOMAIN/api/v2/auth/me" -H "Authorization: Bearer $ACCESS"; echo
```

## 6) Rollback (code only)

```bash
set -e
APP_DIR="/var/www/building-company"
PM2_NAME="building-company"
PREV_SHA="$(cat /var/backups/building-company/prev-sha-REPLACE_TS.txt)"

cd "$APP_DIR"
git fetch --all --prune
git checkout "$PREV_SHA"
npm ci --omit=dev
pm2 restart "$PM2_NAME" --update-env
sleep 2
pm2 save
```

## 7) Rollback (database restore, only when required)

```bash
set -e
DB_URL="$DATABASE_URL"
DUMP="/var/backups/building-company/prod-REPLACE_TS.dump"

pg_restore --clean --if-exists --no-owner --no-privileges -d "$DB_URL" "$DUMP"
```

## 8) Compatibility layer policy

- keep legacy `/api/*` endpoints until all clients are moved to `/api/v2/*`
- monitor errors for legacy endpoints daily
- remove legacy endpoints only after two stable releases on v2
