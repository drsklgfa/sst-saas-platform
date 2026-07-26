FROM node:22-bookworm-slim AS deps
WORKDIR /app
ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sst_saas?schema=public
COPY package*.json ./
COPY prisma ./prisma
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --no-audit --no-fund

FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sst_saas?schema=public \
    APP_URL=http://localhost:3000 \
    AUTH_SECRET=build-only-secret-with-at-least-32-characters \
    STORAGE_DRIVER=local \
    LOCAL_STORAGE_PATH=.data/storage \
    FILE_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && npm run build \
    && test -f node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium \
    RUN_DB_SCHEMA_SYNC=true
RUN apt-get update \
    && apt-get install -y --no-install-recommends chromium ca-certificates fonts-liberation openssl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src ./src
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/docker/entrypoint.sh ./docker/entrypoint.sh
RUN chmod +x ./docker/entrypoint.sh \
    && test -f ./tsconfig.json \
    && test -f ./scripts/preflight-seed.mjs \
    && test -f ./prisma/seed.ts \
    && test -x ./node_modules/.bin/tsx
EXPOSE 3000
ENTRYPOINT ["./docker/entrypoint.sh"]
CMD ["node", "server.js"]
