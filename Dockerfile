# syntax=docker/dockerfile:1

# Stage 1: Build all packages
FROM node:22-alpine AS builder

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace package definitions
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/ ./apps/

# Install dependencies and build
RUN pnpm install --frozen-lockfile
RUN pnpm build

# Stage 2: Runtime image
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install curl for healthcheck
RUN apk add --no-cache curl

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy build artifacts and production node_modules
COPY --from=builder /app ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["pnpm", "dev:web"]
