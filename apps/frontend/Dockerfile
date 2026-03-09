FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY bun.lock package.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN bun install --frozen-lockfile --ignore-scripts

# Build stage
FROM base AS build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY --from=deps /app/node_modules node_modules
COPY --from=deps /app/apps/backend/node_modules apps/backend/node_modules
COPY --from=deps /app/apps/frontend/node_modules apps/frontend/node_modules
COPY --from=deps /app/packages/shared/node_modules packages/shared/node_modules
COPY bun.lock package.json tsconfig.json ./
COPY packages/shared/ packages/shared/
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
