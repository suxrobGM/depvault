# DepVault Platform

DepVault is a web dashboard that analyzes dependencies, detects vulnerabilities, and securely stores environment variables across any tech stack - from package.json to .env to appsettings.json - all in one place.

## Tech Stack

- **Runtime**: Bun - **Backend**: Elysia.js - **DB**: PostgreSQL + Prisma 7 - **DI**: tsyringe
- **Web**: Next.js 16 + MUI + Tailwind v4
- **Shared**: `@depvault/shared` package in `packages/shared/`

## PRD file

The PRD file is located at `docs/prd.md`. It contains the product requirements, user stories, and acceptance criteria for the DepVault platform. Refer to it for any questions about the product's functionality or features.

## PRD & Design References

- **PRD**: `docs/prd.md` — user stories US-01 through US-10, sprint plan, acceptance criteria
- **Sprint Plan**: PRD Section 9 — Sprint 1 (Foundation & Core Analysis), Sprint 2 (Env Vault & Polish)

### UI Component Guidelines

- **Component library**: MUI 7 — prefer MUI components over custom HTML elements
- **Styling**: Tailwind v4 utilities for spacing, layout, responsive. MUI `sx` prop or `styled()` for component theming
- **Data tables**: MUI DataGrid for analysis results, project lists, env variable tables
- **Forms**: MUI TextField, Select, Checkbox with `react-hook-form` + `zod` for validation
- **Layout**: MUI Box, Stack, Grid2. App shell uses persistent sidebar + top app bar
- **Typography**: MUI Typography with semantic variants (h1–h6, body1, body2, caption)

### Key User Flows

1. **Registration**: Landing → Register form → Email verification → Dashboard
2. **Analysis**: Dashboard → Project → Upload file → Parse → Results table with badges
3. **Env vault**: Project → Env tab → Select environment → CRUD variables → Diff view
4. **Secret sharing**: Env vault → Select variables → Generate link → Copy/share → One-time access
5. **Onboarding**: New member → Checklist page → Fill required vars → Download .env.example

## Layout

```text
apps/backend/    → Elysia REST API (port 4000)
apps/frontend/   → Next.js web app (port 4001)
packages/shared/ → Shared types & utils
```

## Commands

```bash
# Backend (cd apps/backend)
bun run dev / start / typecheck
bun test
bun run db:generate / db:push / db:migrate / db:migrate:apply
bun run build:types

# Web (cd apps/frontend)
bun run dev / build / start

# Root
bun run typecheck   # all workspaces
```

## Scrum & Workflow

### Branch Naming

Format: `<type>/<issue-number>-<short-description>`

Types: `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`, `test/`

Examples: `feat/4-email-auth`, `fix/12-jwt-expiry`, `chore/2-ci-pipeline`

### Commit Messages

Conventional Commits format:

```text
<type>(scope): <description>

Refs #<issue-number>
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`

Scopes: `backend`, `frontend`, `shared`, `db`, `ci`

Examples:

- `feat(backend): add email/password registration endpoint`
- `fix(frontend): correct analysis table sorting order`
- `chore(ci): add type-check step to GitHub Actions`

### Pull Request Workflow

1. Create branch from `main` using the naming convention above
2. Commit with `Refs #N` referencing the issue number
3. Open PR with title matching commit convention, body with `## Summary`, `## Test plan`, and `Closes #N`
4. PR must pass CI checks (lint, typecheck, test, build) before merge
5. Use squash merge to keep main history clean

### Issue Board Workflow

- **Backlog** → Issue created, not planned for current sprint
- **Ready** → Planned for current sprint, ready to pick up
- **In Progress** → Branch created, work started
- **In Review** → PR open, awaiting review
- **Done** → PR merged, issue closed

## Comments

Don't add comments that restate what the code already says. Only comment to explain **why**, not **what**. If the code needs a comment to explain what it does, rename the variable or extract a function instead.

## File Size Guideline

Aim for ~300–350 LOC per file as a soft ceiling. If a service or controller grows past this, look for extraction opportunities (repository, helper, or splitting the module). Schema and repository files are naturally shorter.

---

## Frontend Architecture

### Folder Structure (apps/frontend/)

```text
src/
├── app/                 # Next.js App Router pages
│   ├── (auth)/          # Auth pages (login, register, reset-password)
│   ├── (dashboard)/     # Authenticated pages (projects, analysis, vault)
│   └── layout.tsx       # Root layout with theme provider
├── components/          # Reusable UI components
│   ├── ui/              # Generic components (buttons, modals, forms)
│   └── features/        # Feature-specific components
├── hooks/               # Custom React hooks
├── lib/                 # API client, utils, constants
├── providers/           # React context providers (auth, theme)
└── types/               # Frontend-specific TypeScript types
```

### Frontend Conventions

- Use React Server Components by default; add `"use client"` only when needed (state, effects, browser APIs)
- API calls go through a centralized API client in `lib/api.ts`
- Auth state managed via React context with JWT stored in httpOnly cookie
- Use `react-hook-form` + `zod` for form validation
- Page components are thin — delegate to feature components

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

---

## Do's and Don'ts

### Do

- Use `@injectable()` on all service and repository classes
- Use `container.resolve()` in controllers to get service instances
- Use TypeBox (`t.*`) schemas for all request/response validation in Elysia
- Use error classes from `common/errors/` — never throw raw `Error`
- Use UUID for all primary keys
- Add `createdAt` and `updatedAt` to every Prisma model
- Use `Decimal(12,2)` for money fields, never `float`
- Hash passwords with bcrypt, never store plaintext
- Encrypt env variable values with AES-256-GCM before storage
- Keep controllers thin — business logic belongs in services
- Use MUI components for all UI elements in the web app
- Use `next/link` for navigation, `next/image` for images
- Validate user input on both client and server
- Return consistent API response shapes using shared types from `packages/shared/`

### Don't

- Don't install packages without checking if MUI or existing deps already solve the problem
- Don't use `any` — use `unknown` and narrow, or define proper interfaces
- Don't store secrets (API keys, passwords, encryption keys) in code or git
- Don't skip error handling — every service method should handle failure cases
- Don't use `console.log` in production code — use the logger utility from `common/utils/`
- Don't write raw SQL unless the query is too complex for Prisma's query builder
- Don't exceed ~350 LOC per file — extract to separate modules
- Don't use `var` — always `const`, use `let` only when mutation is needed
- Don't commit `.env` files or any file containing real secrets

### Security Rules

- All API endpoints behind auth guard except `/auth/register`, `/auth/login`, `/auth/github`, `/auth/github/callback`
- Only project owner can delete project or manage member roles
- Rate-limit auth endpoints (login, register, password reset)
- Sanitize all user-provided file content before parsing
- Never log decrypted secret values
- One-time links must be cryptographically random and delete content after first access

---

## Testing Strategy

### Backend

- **Framework**: Bun's built-in test runner (`bun test`)
- **Unit tests**: Test service methods with mocked PrismaClient
- **Integration tests**: Test API endpoints using Elysia's `.handle()` method
- **Location**: Co-locate next to source — `{module}.service.test.ts`, `{module}.controller.test.ts`
- **Naming**: `describe("ServiceName")` → `describe("methodName")` → `it("should ...")`

### Frontend

- **Framework**: Vitest + React Testing Library
- **Unit tests**: Utility functions and custom hooks
- **Component tests**: User interactions and rendered output
- **Location**: Co-locate as `{component}.test.tsx`

### Coverage Goals

- Services: 80%+ line coverage
- Parsers: 90%+ (critical path with many edge cases)
- Controllers: integration test for each endpoint
- Frontend: test all form submissions and key user interactions

### What to Test

- Service business logic (validation, transformation, error cases)
- API endpoint request/response contracts
- Dependency file parsers (valid input, malformed input, edge cases)
- Encryption/decryption round-trips
- Auth flows (registration, login, token validation, role checks)

### What NOT to Test

- Prisma queries directly (test through service layer)
- MUI component internals
- Third-party library behavior
- Trivial getters/setters
