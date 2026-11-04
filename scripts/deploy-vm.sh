#!/usr/bin/env bash
#
# Mobius Zero-Cost Deployment Script
# Run this on a fresh Oracle Cloud Always Free ARM VM (Ubuntu 24.04)
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/Sayandeep-the-coder/Mobius/main/scripts/deploy-vm.sh | sudo bash -
#   OR
#   sudo bash scripts/deploy-vm.sh
#

set -euo pipefail

echo "=============================================="
echo "  Mobius Zero-Cost Deployment on Oracle VM"
echo "=============================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# Check if running as root
if [[ $EUID -ne 0 ]]; then
  log_error "This script must be run as root (use sudo)"
  exit 1
fi

# 1. Update system
log_info "Updating system packages..."
apt update && apt upgrade -y

# 2. Install Docker
log_info "Installing Docker..."
if ! command -v docker &> /dev/null; then
  apt install -y docker.io docker-compose-v2 git curl wget ca-certificates gnupg
  systemctl enable --now docker
  usermod -aG docker ubuntu || true
  newgrp docker || true
fi

# 3. Install PostgreSQL client
log_info "Installing PostgreSQL client..."
apt install -y postgresql-client

# 4. Clone repository
MOBIUS_DIR="/home/ubuntu/Mobius/mobius-upstream"
if [[ ! -d "$MOBIUS_DIR" ]]; then
  log_info "Cloning Mobius repository..."
  sudo -u ubuntu git clone https://github.com/Sayandeep-the-coder/Mobius.git /home/ubuntu/Mobius
  sudo -u ubuntu chown -R ubuntu:ubuntu /home/ubuntu/Mobius
else
  log_info "Repository already exists, updating..."
  sudo -u ubuntu git -C /home/ubuntu/Mobius pull
fi

cd "$MOBIUS_DIR"

# 5. Create .env if not exists
if [[ ! -f .env ]]; then
  log_warn ".env not found. Creating from .env.example..."
  sudo -u ubuntu cp .env.example .env
  log_warn "IMPORTANT: Edit .env with your API keys before starting:"
  log_warn "  - SEPOLIA_RPC_URL"
  log_warn "  - GROQ_API_KEY"
  log_warn "  - CADDY_EMAIL"
  log_warn "  - CADDY_DOMAIN"
else
  log_info ".env already exists"
fi

# 6. Start Docker Compose
log_info "Starting Docker Compose services..."
sudo -u ubuntu docker compose up -d --build

# 7. Wait for API to be ready
log_info "Waiting for API to be ready..."
for i in $(seq 1 30); do
  if sudo -u ubuntu docker compose exec -T api curl -s http://localhost:8787/health > /dev/null 2>&1; then
    log_info "API is ready!"
    break
  fi
  sleep 2
done

# 8. Verify
echo ""
echo "=============================================="
echo "  Deployment Complete!"
echo "=============================================="
echo ""
echo "API:          http://$(curl -s http://169.254.169.254/opc/v2/vnics/ | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['publicIp'])" 2>/dev/null || echo "YOUR_VM_IP"):8787"
echo "Health:       http://localhost:8787/health"
echo "Chains:       http://localhost:8787/v1/chains"
echo ""
echo "Next steps:"
echo "  1. Edit .env with your API keys (SEPOLIA_RPC_URL, GROQ_API_KEY)"
echo "  2. Set up Caddy for HTTPS (see caddy/Caddyfile)"
echo "  3. Deploy frontend to Cloudflare Pages"
echo "  4. Set NEXT_PUBLIC_API_URL in frontend env"
echo ""
echo "Logs:  docker compose logs -f"
echo "Stop:  docker compose down"
echo ""
