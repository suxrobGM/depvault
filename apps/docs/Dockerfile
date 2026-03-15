FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY bun.lock package.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY apps/docs/package.json apps/docs/package.json
COPY apps/demo-video/package.json apps/demo-video/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN bun install --frozen-lockfile --ignore-scripts

# Build stage
FROM base AS build
COPY --from=deps /app/node_modules node_modules
COPY --from=deps /app/apps/docs/node_modules apps/docs/node_modules
COPY bun.lock package.json ./
COPY apps/docs/ apps/docs/

WORKDIR /app/apps/docs
RUN bun run build

# Production
FROM oven/bun:1-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/apps/docs/.next/standalone ./
COPY --from=build /app/apps/docs/.next/static apps/docs/.next/static
COPY --from=build /app/apps/docs/public apps/docs/public

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://localhost:4002').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

EXPOSE 4002

CMD ["bun", "run", "apps/docs/server.js"]
