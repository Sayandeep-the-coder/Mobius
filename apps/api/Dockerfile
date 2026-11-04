FROM node:22-alpine

WORKDIR /app

# Copy package files and workspaces
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/api ./apps/api

# Install dependencies in api
WORKDIR /app/apps/api
RUN npm install --legacy-peer-deps

EXPOSE 8787
ENV PORT=8787

CMD ["npx", "tsx", "src/server.ts"]
