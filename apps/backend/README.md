# DepVault - Backend API

Elysia.js REST API server running on the Bun runtime.

## Stack

- **Runtime**: Bun
- **Framework**: Elysia.js v1 (with cors, jwt, swagger, static plugins)
- **Database**: PostgreSQL via Prisma 7 with `@prisma/adapter-pg`
- **DI**: tsyringe (decorator-based)
- **Logging**: pino + pino-pretty
- **Auth**: JWT access tokens + refresh tokens, bcrypt password hashing

## Getting Started

```bash
# Install dependencies (from monorepo root)
cd ../.. && bun install

# Copy environment file
cp .env.example .env
# Edit .env with your values (see Environment section below)

# Generate Prisma client
bun run db:generate

# Push schema to database (development)
bun run db:push

# Seed initial data
bun run db:seed

# Start dev server
bun run dev
```

The server starts at `http://localhost:4000`. Swagger UI is available at `/swagger`.

## Environment Variables

See [.env.example](.env.example) for all variables. Key ones:

| Variable       | Description                     | Default                    |
| -------------- | ------------------------------- | -------------------------- |
| `DATABASE_URL` | PostgreSQL connection string    | `postgresql://...`         |
| `PORT`         | Server port                     | `4000`                     |
| `NODE_ENV`     | Environment                     | `development`              |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:4001,..` |
| `LOG_LEVEL`    | pino log level                  | `info`                     |

## Project Structure

```text
src/
├── app.ts                  # Elysia bootstrap, plugin + controller registration
├── env.ts                  # Environment config with TypeBox validation
├── common/                 # Shared infrastructure
│   ├── di/                 # tsyringe DI container setup
│   ├── errors/             # HttpError classes (400, 401, 403, 404, 409)
│   ├── middleware/         # Auth guard, role middleware, error handler
│   ├── plugins/            # Swagger + CORS Elysia plugins
│   ├── utils/              # password, logger, date helpers
│   ├── services/           # Connection manager
│   └── database/           # Prisma client singleton with pg adapter
├── modules/                # Feature modules (domain-driven)
│   ├── auth/               # Login, register, OTP, password reset
│   ├── users/              # User profile CRUD
│   └── admin/              # User mgmt, creator verification, analytics
├── jobs/                   # Background/scheduled tasks
├── types/                  # Shared Elysia type schemas
└── constants/
```

## Module Convention

Each module follows a **3-file core** pattern with optional extras:

| File                        | Purpose                                       |
| --------------------------- | --------------------------------------------- |
| `{module}.controller.ts`    | Elysia route group (thin HTTP layer)          |
| `{module}.service.ts`       | Business logic, injects PrismaClient via DI   |
| `{module}.schema.ts`        | Elysia `t.*` request/response schemas         |
| `{module}.repository.ts` \* | Complex DB queries (dynamic filters, raw SQL) |
| `{module}.mapper.ts` \*     | Prisma model to API response converters       |

_\* Optional — only add when complexity warrants it._

**When to add a repository**: the module needs search with dynamic WHERE clauses, raw SQL, or multi-table upserts. Skip it if every query is a one-liner `findUnique`/`create`/`update`/`delete`.

**When to add a mapper**: the service has 3+ response mapping functions. Mappers are plain exported functions, not class methods.

## Database

Prisma schema uses multi-file layout in `prisma/schema/`:

### Database Commands

```bash
bun run db:generate       # Regenerate Prisma client after schema changes
bun run db:push           # Push schema to DB without migration (dev only)
bun run db:migrate        # Create a new migration file
bun run db:migrate:apply  # Apply pending migrations (staging/prod)
bun run db:seed           # Seed initial data
```

## Scripts

```bash
bun run dev              # Start with --watch
bun run start            # Start server
bun run typecheck        # tsc --noEmit
bun test                 # Run all tests
bun run build:types      # Emit .d.ts files to dist/
bun run build:linux      # Compile binary for Linux
bun run build:win        # Compile binary for Windows
```
