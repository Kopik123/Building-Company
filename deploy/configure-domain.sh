#!/usr/bin/env bash
# Configure production domain for Building Company on a DigitalOcean Droplet.
# Usage:
#   bash deploy/configure-domain.sh example.com [/var/www/building-company]
set -euo pipefail

DOMAIN="${1:-}"
APP_DIR="${2:-/var/www/building-company}"

if [[ -z "${DOMAIN}" ]]; then
  echo "Usage: bash deploy/configure-domain.sh <domain> [app-dir]"
  exit 1
fi

if [[ ! -d "${APP_DIR}" ]]; then
  echo "App directory not found: ${APP_DIR}"
  exit 1
fi

BASE_URL="https://${DOMAIN}"
NGINX_CONF="/etc/nginx/sites-available/building-company"

echo "Configuring domain: ${DOMAIN}"
echo "App directory: ${APP_DIR}"

# Update placeholder SEO URLs in static files.
find "${APP_DIR}" -maxdepth 1 -type f \( -name "index.html" -o -name "premium-*.html" -o -name "sitemap.xml" -o -name "robots.txt" \) \
  -exec sed -i "s|https://building-company.example|${BASE_URL}|g" {} \;

# Update nginx server_name if config exists.
if [[ -f "${NGINX_CONF}" ]]; then
  sudo sed -i -E "s|^[[:space:]]*server_name[[:space:]]+.*;|    server_name ${DOMAIN} www.${DOMAIN};|" "${NGINX_CONF}"
  sudo nginx -t
  sudo systemctl reload nginx
  echo "Nginx server_name updated to: ${DOMAIN} www.${DOMAIN}"
else
  echo "Nginx config not found at ${NGINX_CONF}."
  echo "If your config path differs, update server_name manually."
fi

echo "Done. Next step (SSL):"
echo "  sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
