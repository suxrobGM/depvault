# Stage 1 — compile a single-file binary
FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Prisma's generator needs openssl present
RUN apk add --no-cache openssl

COPY package.json bun.lock tsconfig.json ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/docs/package.json ./apps/docs/
COPY apps/demo-video/package.json ./apps/demo-video/
COPY packages/shared/package.json ./packages/shared/
COPY packages/crypto/package.json ./packages/crypto/

# --filter installs only the backend's deps (plus its workspace deps), skipping the web/docs trees.
RUN bun install --frozen-lockfile --filter @depvault/backend

COPY packages/shared ./packages/shared
COPY packages/crypto ./packages/crypto
COPY apps/backend ./apps/backend

WORKDIR /app/apps/backend
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" bun run db:generate

# tsc first: --compile drops emitDecoratorMetadata (needed by tsyringe) when fed TS.
RUN ./node_modules/.bin/tsc
RUN cp -r src/generated dist/apps/backend/src/generated
RUN bun build --compile --minify-whitespace --minify-syntax \
    --define 'process.env.NODE_ENV="production"' \
    --target bun-linux-x64 \
    --outfile /app/server \
    dist/apps/backend/src/app.js

# Stage 2 — minimal runtime (no node_modules, just the binary)
FROM alpine:latest AS runner
WORKDIR /app/apps/backend

RUN apk add --no-cache openssl curl libstdc++ libgcc

COPY --from=builder /app/server ./server
COPY --from=builder /app/apps/backend/prisma ./prisma

# Local-upload fallback dir (prod uses R2; compose mounts a volume here)
RUN mkdir -p uploads

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:4000/health || exit 1

CMD ["./server"]
