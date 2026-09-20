#!/usr/bin/env bash
set -e

# ==============================================================================
# APEX INN — Self-Controlled Always-On PostgreSQL 16 Server Setup
# ==============================================================================
# This script sets up a hardened, SSL-encrypted PostgreSQL 16 instance on any
# Ubuntu/Debian/Rocky Linux VM (Oracle Cloud Always-Free, Hetzner, DigitalOcean, etc.)
# ==============================================================================

echo "🚀 Starting APEX INN Production PostgreSQL Setup..."

# 1. Update OS packages
echo "📦 Updating system packages..."
sudo apt-get update -y && sudo apt-get upgrade -y
sudo apt-get install -y curl wget git ufw openssl gzip

# 2. Install Docker & Docker Compose if not present
if ! command -v docker >/dev/null 2>&1; then
  echo "🐳 Installing Docker Engine..."
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  sudo usermod -aG docker "$USER"
fi

# 3. Create SSL Certificates for encrypted PostgreSQL traffic
mkdir -p ssl
if [ ! -f ssl/server.key ] || [ ! -f ssl/server.crt ]; then
  echo "🔒 Generating 2048-bit TLS SSL Certificates..."
  openssl req -new -x509 -days 3650 -nodes -text \
    -out ssl/server.crt \
    -keyout ssl/server.key \
    -subj "/CN=apex-inn-db/O=Apex INN PMS/C=IN"
  chmod 600 ssl/server.key
  chmod 644 ssl/server.crt
fi

# 4. Generate strong cryptographic password if .env is missing
if [ ! -f .env ]; then
  echo "🔑 Generating 24-character cryptographic database password..."
  DB_PASS=$(openssl rand -base64 18 | tr -dc 'a-zA-Z0-9' | head -c 24)
  cat <<EOF > .env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$DB_PASS
POSTGRES_DB=apex_inn_pms
EOF
  echo "✅ Saved to .env"
fi

# 5. Configure Firewall (UFW)
echo "🛡️ Configuring Firewall (UFW)..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH Access'
sudo ufw allow 5432/tcp comment 'PostgreSQL TLS'
sudo ufw --force enable

# 6. Start PostgreSQL container
echo "🚢 Launching PostgreSQL 16 Alpine container..."
docker compose up -d

echo ""
echo "=========================================================="
echo "🌟 PRODUCTION POSTGRESQL 16 READY!"
echo "=========================================================="
SERVER_IP=$(curl -s https://api.ipify.org || hostname -I | awk '{print $1}')
source .env
echo "• Host:         $SERVER_IP"
echo "• Port:         5432"
echo "• User:         $POSTGRES_USER"
echo "• Database:     $POSTGRES_DB"
echo "• Password:     $POSTGRES_PASSWORD"
echo "• SSL Mode:     require"
echo "----------------------------------------------------------"
echo "🔗 Vercel DATABASE_URL connection string:"
echo "postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${SERVER_IP}:5432/${POSTGRES_DB}?sslmode=require"
echo "=========================================================="
