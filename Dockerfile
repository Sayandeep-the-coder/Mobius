FROM node:22-alpine

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./

# Copy packages and API source
COPY packages ./packages
COPY apps/api ./apps/api

# Install API dependencies
WORKDIR /app/apps/api
RUN npm install --legacy-peer-deps

EXPOSE 8787

# Run Express server with tsx
CMD ["npx", "tsx", "src/server.ts"]
