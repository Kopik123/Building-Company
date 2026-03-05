#!/usr/bin/env bash
# Baseline hardening for Ubuntu 22.04/24.04 on DigitalOcean.
# Usage: bash deploy/harden-droplet.sh
set -euo pipefail

echo "==============================================="
echo " Building Company - Security Hardening"
echo "==============================================="

echo "[1/7] Installing security packages..."
sudo apt-get update -q
sudo apt-get install -y -q ufw fail2ban unattended-upgrades apt-listchanges rkhunter clamav

echo "[2/7] Configuring UFW firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo "[3/7] Configuring fail2ban jail rules..."
sudo tee /etc/fail2ban/jail.d/building-company.conf >/dev/null <<'EOF'
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
mode = aggressive
port = ssh
logpath = %(sshd_log)s

[nginx-http-auth]
enabled = true

[nginx-botsearch]
enabled = true
EOF
sudo systemctl enable --now fail2ban
sudo fail2ban-client reload

echo "[4/7] Enabling unattended security updates..."
sudo tee /etc/apt/apt.conf.d/20auto-upgrades >/dev/null <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF
sudo dpkg-reconfigure -f noninteractive unattended-upgrades

echo "[5/7] Scheduling weekly malware/rootkit scans..."
sudo tee /etc/cron.weekly/building-company-security-scan >/dev/null <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
/usr/bin/freshclam >/dev/null 2>&1 || true
/usr/bin/clamscan -ri /var/www/building-company --exclude-dir=node_modules --log=/var/log/clamscan-weekly.log >/dev/null 2>&1 || true
/usr/bin/rkhunter --update >/dev/null 2>&1 || true
/usr/bin/rkhunter --check --skip-keypress --report-warnings-only >/var/log/rkhunter-weekly.log 2>&1 || true
EOF
sudo chmod +x /etc/cron.weekly/building-company-security-scan

echo "[6/7] Running initial signatures update..."
sudo freshclam || true
sudo rkhunter --update || true

echo "[7/7] Security baseline applied."
echo ""
echo "Recommended manual checks:"
echo "  sudo fail2ban-client status"
echo "  sudo ufw status verbose"
echo "  sudo systemctl status unattended-upgrades"
echo ""
echo "Optional hardening: disable SSH password auth after confirming key access"
echo "  sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config"
echo "  sudo systemctl reload ssh"
