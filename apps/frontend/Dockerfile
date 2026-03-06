FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY bun.lock package.json ./
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN bun install --frozen-lockfile

# Build stage
FROM base AS build
COPY --from=deps /app/node_modules node_modules
COPY --from=deps /app/apps/frontend/node_modules apps/frontend/node_modules
COPY --from=deps /app/packages/shared/node_modules packages/shared/node_modules
COPY bun.lock package.json ./
COPY packages/shared/ packages/shared/
COPY apps/frontend/ apps/frontend/

WORKDIR /app/apps/frontend
RUN bun run build

# Production
FROM oven/bun:1-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/apps/frontend/.next/standalone ./
COPY --from=build /app/apps/frontend/.next/static apps/frontend/.next/static
COPY --from=build /app/apps/frontend/public apps/frontend/public

EXPOSE 4001

CMD ["bun", "run", "apps/frontend/server.js"]
