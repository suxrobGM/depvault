FROM oven/bun:1 AS base
WORKDIR /app

# Build stage — install deps, build Next.js
FROM base AS build
COPY bun.lock package.json ./

COPY apps/*/package.json ./apps/
COPY packages/*/package.json ./packages/
RUN for f in apps/*.json packages/*.json; do dir="${f%.json}"; mkdir -p "$dir" && mv "$f" "$dir/package.json"; done

RUN bun install --frozen-lockfile --ignore-scripts

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
