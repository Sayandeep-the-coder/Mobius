# Mobius — Zero-Cost Deployment Guide

Deploy Mobious on Oracle Cloud Always Free ARM VM + Cloudflare Pages frontend. Total cost: **₹0**.

## Architecture

```
┌─────────────────┐       HTTPS       ┌─────────────────────┐
│   Cloudflare    │ ─────────────────►│   Caddy (Oracle VM) │
│    Pages        │                   │   Reverse Proxy     │
│   (Next.js)     │                   │   HTTPS Termination │
└─────────────────┘                   └──────────┬──────────┘
                                                 │
                                                 │ HTTP
                                                 ▼
                                       ┌─────────────────────┐
                                       │   Docker Compose    │
                                       │                     │
                                       │  ┌─────────────┐   │
                                       │  │   API       │   │
                                       │  │ (Express)   │   │
                                       │  │   :8787     │   │
                                       │  └──────┬──────┘   │
                                       │  │   Worker    │   │
                                       │  │ (LangGraph) │   │
                                       │  └──────┬──────┘   │
                                       │  └─────────────┘   │
                                       │         │           │
                                       │  ┌─────▼──────┐   │
                                       │  │ PostgreSQL │   │
                                       │  │   :5432    │   │
                                       │  └─────────────┘   │
                                       └─────────────────────┘
```

---

## Prerequisites

- Oracle Cloud account (free tier signup requires card verification)
- GitHub account (for Cloudflare Pages)
- Groq API key (free tier at console.groq.com)
- SSH key pair

---

## Step 1: Provision Oracle Cloud VM

1. Go to [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)
2. Create account and verify with payment card
3. Create a Compute instance:
   - **Image:** Ubuntu 24.04 ARM64
   - **Shape:** Ampere A1 (Always Free) — up to 2 OCPUs, 12 GB RAM
   - **Boot volume:** 50 GB or more
   - **Network:** Public subnet, assign public IP
   - **SSH keys:** Add your public key
4. Open these ports in Oracle Cloud Security List:
   - 22 (SSH)
   - 80 (HTTP)
   - 443 (HTTPS)
   - 8787 (Mobius API — optional, behind Caddy)
   - 5432 (PostgreSQL — **internal only**, not public)

---

## Step 2: SSH into VM and Install Dependencies

```bash
ssh ubuntu@<YOUR_VM_PUBLIC_IP>

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
sudo apt install -y docker.io docker-compose-v2 git curl wget

sudo systemctl enable --now docker
sudo usermod -aG docker $USER
newgrp docker

# Install PostgreSQL client (for psql)
sudo apt install -y postgresql-client
```

---

## Step 3: Clone Mobious Repository

```bash
cd ~
git clone https://github.com/Sayandeep-the-coder/Mobius.git
cd Mobius/mobius-upstream
```

---

## Step 4: Configure Environment

Create `/home/ubuntu/Mobius/mobius-upstream/.env`:

```bash
# Monad Testnet
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
MONAD_CHAIN_ID=10143

# Ethereum Sepolia
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
SEPOLIA_CHAIN_ID=11155111

# Aave V3 Sepolia
AAVE_SEPOLIA_POOL_ADDRESSES_PROVIDER=0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A
AAVE_SEPOLIA_DAI=0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357

# MockSwapTarget (Monad Testnet - deployed)
MOCK_SWAP_TARGET_ADDRESS=0xA64c3bA49910baa01515360278AA2542AaAD0219
MOCK_SWAP_TARGET_OWNER=0x2345ff8Ca8cf8c504F01d26F7064Ef7cb31Dc75D

# API
PORT=8787
NODE_ENV=production

# LLM (Groq)
LLM_ENABLED=true
LLM_PROVIDER=groq
LLM_MODEL=llama-3.1-8b-instant
GROQ_API_KEY=your_groq_api_key_here
GROQ_BASE_URL=https://api.groq.com/openai/v1

# PostgreSQL (local)
DATABASE_URL=postgresql://mobious:mobious_dev_password@localhost:5432/mobious
POSTGRES_USER=mobious
POSTGRES_PASSWORD=mobious_dev_password
POSTGRES_DB=mobious

# Caddy
CADDY_DOMAIN=your-domain.com  # or use pages.dev subdomain
```

Replace `YOUR_API_KEY` with your actual Alchemy/Infura key and `your_groq_api_key_here` with your Groq key.

---

## Step 5: Docker Compose

Create `docker-compose.yml` in the project root:

```yaml
version: "3.8"

services:
  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    restart: unless-stopped
    env_file: .env
    ports:
      - "8787:8787"
    depends_on:
      - postgres
    networks:
      - mobious-network

  worker:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    restart: unless-stopped
    command: npm run worker
    env_file: .env
    depends_on:
      - postgres
      - api
    networks:
      - mobious-network

  postgres:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: mobious
      POSTGRES_USER: mobious
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    networks:
      - mobious-network

networks:
  mobious-network:
    driver: bridge

volumes:
  postgres_data:
```

Create `scripts/init-db.sql`:

```sql
-- Mobius database initialization
-- LangGraph checkpointer tables
CREATE TABLE IF NOT EXISTS checkpoints (
  thread_id TEXT NOT NULL,
  checkpoint_ns TEXT NOT NULL DEFAULT '',
  checkpoint_id TEXT NOT NULL,
  parent_checkpoint_id TEXT,
  type TEXT NOT NULL,
  checkpoint BYTEA NOT NULL,
  metadata BYTEA NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id)
);

CREATE TABLE IF NOT EXISTS checkpoint_writes (
  thread_id TEXT NOT NULL,
  checkpoint_ns TEXT NOT NULL DEFAULT '',
  checkpoint_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  idx INTEGER NOT NULL,
  channel TEXT NOT NULL,
  value BYTEA NOT NULL,
  PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
);

-- Mobius application tables
CREATE TABLE IF NOT EXISTS agent_policies (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  allowed_chains JSONB NOT NULL DEFAULT '[]',
  allowed_actions JSONB NOT NULL DEFAULT '[]',
  max_amount_per_action TEXT NOT NULL DEFAULT '0',
  max_total_per_session TEXT NOT NULL DEFAULT '0',
  allowed_assets JSONB NOT NULL DEFAULT '[]',
  expires_at BIGINT,
  require_human_approval_above TEXT DEFAULT '0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_positions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  contract_address TEXT NOT NULL,
  position_type TEXT NOT NULL,
  asset TEXT NOT NULL,
  amount TEXT NOT NULL,
  health_factor TEXT,
  liquidation_distance TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS execution_records (
  id SERIAL PRIMARY KEY,
  execution_id TEXT NOT NULL UNIQUE,
  plan_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  tx_hash TEXT,
  block_number TEXT,
  predicted_state JSONB,
  actual_state JSONB,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  included_at TIMESTAMP WITH TIME ZONE,
  safe_at TIMESTAMP WITH TIME ZONE,
  finalized_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_agent_policies_user ON agent_policies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_positions_user ON user_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_execution_records_plan ON execution_records(plan_id);
CREATE INDEX IF NOT EXISTS idx_execution_records_status ON execution_records(status);
```

---

## Step 6: Backend Dockerfile

Create `apps/api/Dockerfile`:

```dockerfile
FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy backend code
COPY apps/api ./apps/api
COPY packages ./packages
COPY .env ./

# Build TypeScript
WORKDIR /app/apps/api
RUN npm run build

EXPOSE 8787

CMD ["npm", "start"]
```

Note: You'll need to add a `package.json` at the root or adjust the Dockerfile to work with the monorepo structure. Alternatively, copy the whole project:

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY . .

RUN npm ci --workspaces

WORKDIR /app/apps/api
RUN npm run build

EXPOSE 8787

CMD ["npm", "start"]
```

Add a root `package.json` if needed:

```json
{
  "name": "mobious",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "apps/api",
    "packages/*"
  ],
  "scripts": {
    "dev": "cd apps/api && npm run dev",
    "build": "cd apps/api && npm run build",
    "start": "cd apps/api && npm start",
    "worker": "cd apps/api && npm run worker"
  }
}
```

---

## Step 7: Caddy Reverse Proxy

Create `caddy/Caddyfile`:

```caddy
# Replace your-domain.com with your actual domain or use a free subdomain
{
    email your-email@example.com
    admin localhost:2019
}

your-domain.com {
    reverse_proxy localhost:8787
}

api.your-domain.com {
    reverse_proxy localhost:8787
}
```

Or use Cloudflare Tunnel (no domain needed):

```caddy
{
    email your-email@example.com
    admin localhost:2019
}

mobious-api.your-domain.com {
    reverse_proxy localhost:8787
}
```

Or if you don't have a domain, use Cloudflare Tunnel:

```caddy
{
    email your-email@example.com
    admin localhost:2019
}

# Cloudflare Tunnel will handle the domain
{
    reverse_proxy localhost:8787
}
```

Install Caddy:

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

Start Caddy:

```bash
sudo systemctl enable --now caddy
```

---

## Step 8: Deploy on Oracle VM

```bash
cd ~/Mobius/mobius-upstream

# Build and start
docker compose up -d --build

# Check status
docker compose ps

# View logs
docker compose logs -f api
docker compose logs -f worker
docker compose logs -f postgres
```

Verify the API is running:

```bash
curl http://localhost:8787/health
curl http://localhost:8787/v1/chains
```

---

## Step 9: Frontend on Cloudflare Pages

1. Push your frontend code to GitHub
2. Go to [Cloudflare Pages](https://pages.cloudflare.com/)
3. Connect your GitHub repository
4. Build settings:
   - Build command: `npm run build`
   - Build output directory: `.next` (or `out` for static export)
   - Environment variables: `NEXT_PUBLIC_API_URL=https://your-domain.com`
5. Deploy

Update your `.env` with `NEXT_PUBLIC_API_URL=https://your-domain.com`

---

## Step 8: Verify Everything

```bash
# Check all containers
docker compose ps

# Test API health
curl http://localhost:8787/health

# Test chains endpoint
curl http://localhost:8787/v1/chains

# Test preflight
curl -X POST http://localhost:8787/v1/preflight \
  -H "Content-Type: application/json" \
  -d '{"chainId":10143,"from":"0xYOUR_ADDRESS","to":"0xA64c3bA49910baa01515360278AA2542AaAD0219","data":"0x","value":"0"}'

# Test agentic plan
curl -X POST http://localhost:8787/v1/agentic/plan \
  -H "Content-Type: application/json" \
  -d '{"chainId":10143,"account":"0xYOUR_ADDRESS","objective":{"type":"execute_swap","description":"Test swap"},"constraints":{"minAmountOut":"90"},"context":{"protocol":"MockSwapTarget","actionFamily":"swap","parameters":{"target":"0xA64c3bA49910baa01515360278AA2542AaAD0219","amountIn":"100","minOut":"90"}}}'
```

---

## Maintenance

```bash
# View logs
docker compose logs -f --tail=50

# Restart services
docker compose restart

# Update code
git pull
docker compose up -d --build

# Database backup
docker exec mobious-postgres-1 pg_dump -U mobious mobious > backup.sql

# Database restore
cat backup.sql | docker exec -i mobious-postgres-1 psql -U mobious mobious
```

---

## Security Notes

- PostgreSQL is only accessible inside the Docker network (not exposed publicly)
- Caddy handles HTTPS termination with automatic Let's Encrypt certificates
- API keys are in `.env` (never commit to git)
- Consider adding rate limiting and authentication for production use
- Oracle VM free tier can be reclaimed — set up regular backups

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Container won't start | Check `docker compose logs` |
| Can't connect to DB | Verify PostgreSQL is running and network allows it |
| Caddy SSL fails | Check DNS points to VM IP, port 80/443 open |
| Groq rate limits | Reduce LLM usage or upgrade Groq plan |
| Out of memory | Reduce worker concurrency or upgrade VM |

---

## Next Steps

1. Add authentication to API endpoints
2. Implement rate limiting
3. Add monitoring (Prometheus + Grafana)
4. Set up automated backups to Oracle Object Storage
5. Implement wallet connection on frontend