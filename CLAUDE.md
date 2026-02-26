# DepVault Platform

DepVault is a web dashboard that analyzes dependencies, detects vulnerabilities, and securely stores environment variables across any tech stack - from package.json to .env to appsettings.json - all in one place.

## Tech Stack

- **Runtime**: Bun - **Backend**: Elysia.js - **DB**: PostgreSQL + Prisma 7 - **DI**: tsyringe
- **Web**: Next.js 16 + MUI + Tailwind v4
- **Shared**: `@mehnatsevar/shared` package in `packages/shared/`

## PRD file

The PRD file is located at `docs/prd.md`. It contains the product requirements, user stories, and acceptance criteria for the DepVault platform. Refer to it for any questions about the product's functionality or features.

## Layout

```text
apps/backend/    → Elysia REST API (port 4000)
apps/web/        → Next.js web app (port 4001)
packages/shared/ → Shared types & utils
```

## Commands

```bash
# Backend (cd apps/backend)
bun run dev / start / typecheck
bun test
bun run db:generate / db:push / db:migrate / db:migrate:apply
bun run build:types

# Web (cd apps/web)
bun run dev / build / start

# Root
bun run typecheck   # all workspaces
```

## Comments

Don't add comments that restate what the code already says. Only comment to explain **why**, not **what**. If the code needs a comment to explain what it does, rename the variable or extract a function instead.

## File Size Guideline

Aim for ~300–350 LOC per file as a soft ceiling. If a service or controller grows past this, look for extraction opportunities (repository, helper, or splitting the module). Schema and repository files are naturally shorter.

---

## Backend Architecture

## Folder Structure

```text
src/
├── app.ts              # Elysia bootstrap, plugin + controller registration
├── env.ts              # Environment config with TypeBox validation
├── common/
│   ├── di/             # tsyringe container — registers PrismaClient as instance
│   ├── errors/         # HttpError classes (400, 401, 403, 404, 409)
│   ├── middleware/      # auth guard, role guard, global error handler
│   ├── plugins/        # swagger + cors Elysia plugins
│   ├── utils/          # password, logger, date, billing, commission helpers
│   ├── services/       # connection manager
│   └── database/       # Prisma client singleton with pg adapter
├── modules/            # Feature modules (domain-driven)
├── jobs/               # Background/scheduled tasks
├── types/              # Shared Elysia schemas (pagination, request, response)
└── constants/
```

## DI Pattern

- Services: `@injectable()` class, constructor-injects `PrismaClient` (or a repository)
- Repositories: `@injectable()` class with pure Prisma queries
- Controllers: resolve service via `container.resolve(ServiceClass)`
- PrismaClient registered in `common/di/container.ts` via `container.registerInstance()`

## Auth

- **Auth guard**: Elysia `derive({ as: "scoped" })` — verifies JWT and injects typed `user` into context. Only applies to modules that `.use(authGuard)`.
- **Role guard**: chains auth guard and checks `user.role`. Usage: `.use(roleGuard("ADMIN"))`.

## Error Handling

Throw from services: `NotFoundError`, `BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `ConflictError`. Global error middleware maps them to HTTP responses.

---

## Database Conventions

Applies when modifying Prisma schema files or writing database queries.

## Schema

- **ORM**: Prisma 7 with PostgreSQL driver adapter (`@prisma/adapter-pg`)
- **Schema location**: `apps/backend/prisma/schema/` (multi-file via `prismaSchemaFolder`)

## Model Rules

- **IDs**: UUID for all primary keys
- **Money**: `Decimal(12,2)` for prices, `Decimal(14,2)` for balances/totals
- **Soft deletes**: `deletedAt DateTime?` on User and Message models
- **Timestamps**: every model must have `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`

## Workflow

```bash
bun run db:generate       # After schema edits — regenerate client
bun run db:push           # Dev only — push without migration
bun run db:migrate        # Create migration file for staging/prod
bun run db:migrate:apply  # Apply pending migrations
```

---

## File Pattern

Each module uses a 3-file core with optional extras:

- `{module}.controller.ts` — Elysia route group (thin HTTP layer), resolves service via `container.resolve()`
- `{module}.service.ts` — `@injectable()` class with business logic, injects `PrismaClient` for simple queries
- `{module}.schema.ts` — Elysia `t.*` (TypeBox) request/response schemas, type aliases grouped at end of file

### Optional Files

- `{module}.repository.ts` — Only when the module has dynamic WHERE clauses, raw SQL, or multi-table upserts. Skip for simple `findUnique`/`create`/`update`/`delete`.
- `{module}.mapper.ts` — Pure exported functions (not class methods) that convert Prisma models to API response shapes. Extract when the service has 3+ mapping functions. Handle `Decimal` → `Number` and nested relation flattening.
- `{module}.ws.ts` — WebSocket handlers (currently only `messages/` module).

## Registration

Every module exports an Elysia plugin. Register it in `src/app.ts`:

```ts
import { ordersController } from "./modules/orders";

app.use(ordersController);
```
