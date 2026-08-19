# syntax=docker/dockerfile:1

# --- Stage 1: Build workspace ---
FROM node:22-bookworm AS builder
WORKDIR /app
RUN corepack enable
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages packages
COPY apps apps
RUN pnpm install --frozen-lockfile
RUN pnpm build

# --- Stage 2: Production runtime ---
FROM node:22-bookworm-slim AS runtime
# bookworm-slim (glibc cho better-sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy production artifacts
COPY --from=builder /app/apps/web/server/dist ./server
COPY --from=builder /app/apps/web/client/dist ./public
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production CORVUS_DATA_DIR=/var/lib/corvus CORVUS_PORT=8080
VOLUME /var/lib/corvus
USER node
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://127.0.0.1:8080/ || exit 1

CMD ["node", "server/index.js"]
