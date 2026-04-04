FROM oven/bun:1 AS base
WORKDIR /app

# Build stage — install deps, generate Prisma client
FROM base AS build
COPY bun.lock package.json ./

COPY apps/*/package.json ./apps/
COPY packages/*/package.json ./packages/
RUN for f in apps/*.json packages/*.json; do dir="${f%.json}"; mkdir -p "$dir" && mv "$f" "$dir/package.json"; done

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

COPY apps/*/package.json ./apps/
COPY packages/*/package.json ./packages/
RUN for f in apps/*.json packages/*.json; do dir="${f%.json}"; mkdir -p "$dir" && mv "$f" "$dir/package.json"; done

RUN bun install --frozen-lockfile --production --ignore-scripts

WORKDIR /app/apps/backend
RUN mkdir -p uploads

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://localhost:4000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

EXPOSE 4000

CMD ["bun", "run", "start"]
