# Mobius — Zero-Cost Deployment Guide

Deploy Mobius on Render Free Tier + Vercel frontend. Total cost: **₹0**.

## Architecture

```
┌─────────────┐       HTTPS       ┌─────────────────────┐
│   Vercel    │ ─────────────────►│   Render Web Service│
│  (Next.js)  │                   │   (Express API)   │
└─────────────┘                   └──────────┬──────────┘
                                             │
                                             │ HTTP
                                             ▼
                                       ┌─────────────────────┐
                                       │   Render            │
                                       │   PostgreSQL        │
                                       │   (Managed DB)      │
                                       └─────────────────────┘

Background Worker: Render Worker Service (free tier)
```

---

## Prerequisites

- Render account (free tier)
- GitHub account (for Vercel + Render)
- Groq API key (free tier at console.groq.com)
- Ethereum Sepolia RPC provider (Alchemy/Infura/QuickNode)

---

## Important Limitations (Render Free Tier)

| Limitation | Impact on Mobius |
|---|---|
| Web services sleep after 15 min inactivity | API cold-starts on first request (~30s) |
| PostgreSQL free tier: 1 GB storage, 100 compute hours/month | Sufficient for prototyping, not production |
| Render free PostgreSQL expires after 7 days | Must manually re-enable in dashboard weekly |
| No persistent disk on free tier | Data persists via Render's managed Postgres, not local disk |
| Background workers may have limited uptime | Position monitoring may have gaps |

**Best for:** Hackathons, prototypes, early testing.  
**Not for:** Real user funds or production financial services.

---

## Step 1: Create Render Account

1. Go to [Render.com](https://render.com/)
2. Sign up with GitHub
3. Verify email

---

## Step 2: Deploy PostgreSQL on Render

1. In Render dashboard, click **"New +"** → **"PostgreSQL"**
2. Configure:
   - **Name:** `mobius-db`
   - **Database:** `mobious`
   - **User:** `mobious`
   - **Region:** Choose closest to you
   - **Instance type:** `Free`
3. Click **Create Database**
4. Copy the **Internal Connection String** (starts with `postgres://`)

---

## Step 3: Deploy Backend on Render

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository: `Sayandeep-the-coder/Mobius`
3. Configure:
   - **Name:** `mobius-api`
   - **Root Directory:** `apps/api`
   - **Runtime:** `Docker` (or use Dockerfile)
   - **Build Command:** `npm ci && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`
4. Add Environment Variables:
   ```
   MONAD_RPC_URL=https://testnet-rpc.monad.xyz
   MONAD_CHAIN_ID=10143
   SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
   SEPOLIA_CHAIN_ID=11155111
   AAVE_SEPOLIA_POOL_ADDRESSES_PROVIDER=0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A
   AAVE_SEPOLIA_DAI=0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357
   MOCK_SWAP_TARGET_ADDRESS=0xA64c3bA49910baa01515360278AA2542AaAD0219
   MOCK_SWAP_TARGET_OWNER=0x2345ff8Ca8cf8c504F01d26F7064Ef7cb31Dc75D
   PORT=8787
   NODE_ENV=production
   LLM_ENABLED=true
   LLM_PROVIDER=groq
   LLM_MODEL=llama-3.1-8b-instant
   GROQ_API_KEY=your_groq_api_key
   DATABASE_URL=<your Render PostgreSQL internal connection string>
   NEXT_PUBLIC_API_URL=https://mobius-api.onrender.com
   ```
5. Click **Create Web Service**

Wait for deployment. Your API will be at `https://mobius-api.onrender.com`

---

## Step 4: Deploy Frontend on Vercel

1. Go to [Vercel](https://vercel.com/)
2. Sign up with GitHub
3. Click **"Add New"** → **"Project"**
4. Import your GitHub repository: `Sayandeep-the-coder/Mobius`
5. Configure:
   - **Framework Preset:** Next.js
   - **Build Command:** `npm run build` (run from frontend directory)
   - **Install Command:** `npm install`
   - **Output Directory:** `.next` (or `out`)
   - **Root Directory:** `apps/frontend` (or wherever your Next.js app is)
6. Add Environment Variables:
   - `NEXT_PUBLIC_API_URL=https://mobius-api.onrender.com`
7. Click **Deploy**

Your frontend will be at `https://mobius.vercel.app` (or your custom domain)

---

## Step 5: Background Worker (Optional)

Render's free tier has limited background worker support. For position monitoring:

1. Create another Web Service in Render
2. Set command to `npm run worker` (from `apps/api`)
3. Set same environment variables as API
4. Note: Free tier web services sleep after 15 min inactivity

Alternatively, run the worker locally or on a cron job.

---

## Render Free Tier Limitations

| Item | Free Tier Limit |
|------|----------------|
| Web services | Sleep after 15 min inactivity |
| PostgreSQL | 1 GB storage, 100 compute hours/month, expires after 7 days |
| Outbound bandwidth | 100 GB/month |
| Build minutes | 500 hours/month |

**Workarounds:**
- Use [cron-job.org](https://cron-job.org/) to ping your API every 14 minutes to prevent sleep
- Renew PostgreSQL free tier every 7 days in Render dashboard
- Monitor usage in Render dashboard billing page

---

## Dockerfile (for Render)

The `apps/api/Dockerfile` is already configured for Render:

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 8787
CMD ["npm", "start"]
```

Render will detect the Dockerfile and build automatically.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Web service sleeps | Use cron-job.org to ping `/health` every 14 min |
| PostgreSQL expires | Re-enable in Render dashboard every 7 days |
| Build fails | Check `npm ci` has all dependencies in `package.json` |
| CORS errors | Add `VERCEL_URL` to CORS allowed origins in API |
| Groq rate limits | Reduce LLM usage or upgrade Groq plan |

---

## Cost Summary

| Item | Monthly Cost |
|------|-------------|
| Vercel Frontend | ₹0 |
| Render Web Service (API) | ₹0 |
| Render PostgreSQL | ₹0 |
| Groq (free tier) | ₹0 |
| Total | **₹0** |

---

## What's NOT Covered

- Custom domain (use `*.vercel.app` and `*.onrender.com` subdomains)
- Production-grade availability (free tier sleeps)
- Real user funds (prototype only)
- Automated backups (manual pg_dump if needed)