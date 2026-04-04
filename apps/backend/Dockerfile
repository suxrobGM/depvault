FROM oven/bun:1 AS base
WORKDIR /app

# Build stage — install deps, generate Prisma client
FROM base AS build
COPY bun.lock package.json ./

COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY apps/docs/package.json apps/docs/package.json
COPY apps/demo-video/package.json apps/demo-video/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/crypto/package.json packages/crypto/package.json

RUN bun install --frozen-lockfile --ignore-scripts

COPY packages/shared/ packages/shared/
COPY packages/crypto/ packages/crypto/
COPY apps/backend/ apps/backend/

WORKDIR /app/apps/backend
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" bun db:generate

# Production — prune to production deps only
FROM base AS runner
ENV NODE_ENV=production

COPY --from=build /app/package.json package.json
COPY --from=build /app/bun.lock bun.lock
COPY --from=build /app/packages/shared packages/shared
COPY --from=build /app/packages/crypto packages/crypto
COPY --from=build /app/apps/backend apps/backend

COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY apps/docs/package.json apps/docs/package.json
COPY apps/demo-video/package.json apps/demo-video/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/crypto/package.json packages/crypto/package.json

RUN bun install --frozen-lockfile --production --ignore-scripts

WORKDIR /app/apps/backend
RUN mkdir -p uploads

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://localhost:4000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

EXPOSE 4000

CMD ["bun", "run", "start"]
