FROM oven/bun:1 AS base
WORKDIR /app

# Build stage — install deps, generate types, build Next.js
FROM base AS build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY bun.lock package.json tsconfig.json ./

COPY apps/*/package.json ./apps/
COPY packages/*/package.json ./packages/
RUN for f in apps/*.json packages/*.json; do dir="${f%.json}"; mkdir -p "$dir" && mv "$f" "$dir/package.json"; done

RUN bun install --frozen-lockfile --ignore-scripts

COPY packages/shared/ packages/shared/
COPY packages/crypto/ packages/crypto/
COPY apps/backend/ apps/backend/
COPY apps/frontend/ apps/frontend/

# Generate backend type declarations for Eden Treaty
WORKDIR /app/apps/backend
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" bun db:generate
RUN bun build:types

WORKDIR /app/apps/frontend
RUN bun run build

# Production
FROM oven/bun:1-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/apps/frontend/.next/standalone ./
COPY --from=build /app/apps/frontend/.next/static apps/frontend/.next/static
COPY --from=build /app/apps/frontend/public apps/frontend/public

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://localhost:4001').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

EXPOSE 4001

CMD ["bun", "run", "apps/frontend/server.js"]
