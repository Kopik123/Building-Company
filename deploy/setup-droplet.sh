#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${1:-/var/www/building-company}"

echo "[1/6] Updating apt indexes..."
sudo apt update

echo "[2/6] Installing Node.js, Nginx and certbot..."
sudo apt install -y nodejs npm nginx certbot python3-certbot-nginx

echo "[3/6] Installing PM2 globally..."
sudo npm install -g pm2

echo "[4/6] Preparing app directory: ${APP_DIR}"
sudo mkdir -p "${APP_DIR}"
sudo chown -R "$USER":"$USER" "${APP_DIR}"

echo "[5/6] Dependencies install"
if [[ -f "${APP_DIR}/package-lock.json" ]]; then
  (cd "${APP_DIR}" && npm ci)
else
  (cd "${APP_DIR}" && npm install)
fi

echo "[6/6] PM2 startup registration"
cd "${APP_DIR}"
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup systemd -u "$USER" --hp "$HOME"

echo "Done. Configure Nginx site and SSL next."