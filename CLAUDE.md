# DepVault Platform

DepVault is a web dashboard that analyzes dependencies, detects vulnerabilities, and securely stores environment variables across any tech stack - from package.json to .env to appsettings.json - all in one place.

## Tech Stack

- **Runtime**: Bun — **Backend**: Elysia.js — **DB**: PostgreSQL + Prisma 7 — **DI**: tsyringe
- **Web**: Next.js 16 + MUI + Tailwind v4
- **Shared**: `@mehnatsevar/shared` package in `packages/shared/`

## Layout

```text
apps/backend/    → Elysia REST API (port 4000)
apps/web/        → Next.js web app (port 4001)
packages/shared/ → Shared types & utils
```
