FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY bun.lock package.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY apps/docs/package.json apps/docs/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN bun install --frozen-lockfile --production --ignore-scripts

# Build stage
FROM base AS build
COPY bun.lock package.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY apps/docs/package.json apps/docs/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN bun install --frozen-lockfile --ignore-scripts

COPY packages/shared/ packages/shared/
COPY apps/backend/ apps/backend/

WORKDIR /app/apps/backend
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" bun db:generate

# Production
FROM base AS runner
ENV NODE_ENV=production

COPY --from=deps /app/node_modules node_modules
COPY --from=deps /app/apps/backend/node_modules apps/backend/node_modules
COPY --from=deps /app/packages/shared/node_modules packages/shared/node_modules
COPY --from=build /app/packages/shared packages/shared
COPY --from=build /app/apps/backend apps/backend
COPY --from=build /app/package.json package.json

WORKDIR /app/apps/backend

RUN mkdir -p uploads

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://localhost:4000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

EXPOSE 4000

CMD ["bun", "run", "start"]
