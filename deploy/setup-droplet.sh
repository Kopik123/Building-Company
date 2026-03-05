#!/usr/bin/env bash
# Setup script for DigitalOcean Ubuntu 22.04/24.04 Droplet
# Usage: bash deploy/setup-droplet.sh [app-dir] [domain]
# Example: bash deploy/setup-droplet.sh /var/www/building-company example.com
set -euo pipefail

APP_DIR="${1:-/var/www/building-company}"
DOMAIN="${2:-}"
DB_NAME="building_company"
DB_USER="buildingco"
# Generate random secrets
DB_PASS="$(openssl rand -hex 16)"
JWT_SECRET_GENERATED="$(openssl rand -hex 32)"
BOOTSTRAP_KEY_GENERATED="$(openssl rand -hex 24)"

echo "================================================"
echo " Building Company – Droplet Setup"
echo " App dir : ${APP_DIR}"
echo " Domain  : ${DOMAIN:-<not set – edit nginx config>}"
echo "================================================"

# ── helper: check whether node is already at a supported version ───────────────
node_is_sufficient() {
  command -v node &>/dev/null || return 1
  local major
  major="$(node -e 'process.stdout.write(String(process.versions.node.split(".")[0]))')"
  [[ "${major}" -ge 18 ]]
}

# ── 1. System packages ─────────────────────────────────────────────────────────
echo ""
echo "[1/8] Updating package index..."
sudo apt-get update -q

echo "[2/8] Installing system dependencies (Nginx, Certbot, curl)..."
sudo apt-get install -y -q nginx certbot python3-certbot-nginx curl

# ── 2. Node.js LTS via NodeSource ─────────────────────────────────────────────
echo ""
echo "[3/8] Installing Node.js LTS (v22) via NodeSource..."
if ! node_is_sufficient; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
echo "    Node $(node -v) / npm $(npm -v)"

# ── 3. PM2 ────────────────────────────────────────────────────────────────────
echo ""
echo "[4/8] Installing PM2 globally..."
sudo npm install -g pm2 --quiet

# ── 4. PostgreSQL ─────────────────────────────────────────────────────────────
echo ""
echo "[5/8] Installing and configuring PostgreSQL..."
sudo apt-get install -y -q postgresql postgresql-contrib

# Ensure the PostgreSQL service is running
sudo systemctl enable --now postgresql

# Create database user and database (idempotent)
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" \
  | grep -q 1 || sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" \
  | grep -q 1 || sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

echo "    PostgreSQL ready: database '${DB_NAME}', user '${DB_USER}'"

# ── 5. App directory ──────────────────────────────────────────────────────────
echo ""
echo "[6/8] Preparing app directory: ${APP_DIR}"
sudo mkdir -p "${APP_DIR}"
sudo chown -R "$USER":"$USER" "${APP_DIR}"

# Create uploads and logs directories
mkdir -p "${APP_DIR}/uploads"
mkdir -p "${APP_DIR}/logs"

# Bootstrap .env from example if it doesn't exist yet
if [[ ! -f "${APP_DIR}/.env" && -f "${APP_DIR}/.env.example" ]]; then
  cp "${APP_DIR}/.env.example" "${APP_DIR}/.env"
  # Inject the generated database credentials
  sed -i "s|postgresql://buildingco:CHANGE_ME@localhost:5432/building_company|postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}|g" \
    "${APP_DIR}/.env"
  # Inject the generated JWT secret
  sed -i "s|CHANGE_ME_use_openssl_rand_hex_32|${JWT_SECRET_GENERATED}|g" \
    "${APP_DIR}/.env"
  # Inject the generated bootstrap admin key
  sed -i "s|CHANGE_ME_use_openssl_rand_hex_24|${BOOTSTRAP_KEY_GENERATED}|g" \
    "${APP_DIR}/.env"
  echo "    ✔  .env created with auto-generated DATABASE_URL, JWT_SECRET and BOOTSTRAP_ADMIN_KEY"
  echo "    ⚠  Edit ${APP_DIR}/.env and set SMTP_* and CONTACT_TO before using the contact form."
fi

# ── 6. Node dependencies ──────────────────────────────────────────────────────
echo ""
echo "[7/8] Installing Node.js dependencies..."
if [[ -f "${APP_DIR}/package-lock.json" ]]; then
  (cd "${APP_DIR}" && npm ci --omit=dev)
else
  (cd "${APP_DIR}" && npm install --omit=dev)
fi

# ── 7. PM2 ────────────────────────────────────────────────────────────────────
echo ""
echo "[8/8] Starting app with PM2 and registering systemd startup..."
cd "${APP_DIR}"
pm2 start ecosystem.config.js --env production
pm2 save

# pm2 startup prints a command that must be run as root; capture and execute it.
PM2_STARTUP_CMD="$(pm2 startup systemd -u "$USER" --hp "$HOME" | tail -1)"
eval "sudo ${PM2_STARTUP_CMD#sudo }"

# ── 8. Nginx ──────────────────────────────────────────────────────────────────
NGINX_CONF="/etc/nginx/sites-available/building-company"
if [[ ! -f "${NGINX_CONF}" ]]; then
  sudo cp "${APP_DIR}/deploy/nginx/building-company.conf" "${NGINX_CONF}"
  # Replace hardcoded app path with the actual APP_DIR
  sudo sed -i "s|/var/www/building-company|${APP_DIR}|g" "${NGINX_CONF}"
  if [[ -n "${DOMAIN}" ]]; then
    sudo sed -i "s/your-domain.com/${DOMAIN}/g" "${NGINX_CONF}"
  fi
  sudo ln -sf "${NGINX_CONF}" /etc/nginx/sites-enabled/building-company
  sudo rm -f /etc/nginx/sites-enabled/default
  sudo nginx -t && sudo systemctl reload nginx
  echo "    Nginx site enabled."
fi

echo ""
echo "════════════════════════════════════════════════"
echo " Setup complete!"
echo ""
echo " Next steps:"
echo "  1. Note your BOOTSTRAP_ADMIN_KEY (used to create the first admin account):"
echo "       $(grep '^BOOTSTRAP_ADMIN_KEY=' "${APP_DIR}/.env" | cut -d= -f2-)"
echo "  2. Edit ${APP_DIR}/.env to configure SMTP (contact form e-mail):"
echo "       nano ${APP_DIR}/.env"
echo "  3. Restart app after editing .env:"
echo "       pm2 restart building-company"
if [[ -n "${DOMAIN}" ]]; then
  echo "  3. Obtain SSL certificate:"
  echo "       sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
else
  echo "  3. Set your domain in /etc/nginx/sites-available/building-company"
  echo "     then run: sudo certbot --nginx -d YOUR_DOMAIN"
fi
echo "  4. Run security hardening baseline (firewall, fail2ban, auto-updates):"
echo "       bash ${APP_DIR}/deploy/harden-droplet.sh"
echo "════════════════════════════════════════════════"
