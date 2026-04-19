# DepVault Platform

DepVault is a web dashboard that analyzes dependencies, detects vulnerabilities, and securely stores environment variables across any tech stack — from package.json to .env to appsettings.json — all in one place. All secrets are **end-to-end encrypted** client-side; the server is zero-knowledge.

## Tech Stack

- **Runtime**: Bun — **Backend**: Elysia.js — **DB**: PostgreSQL + Prisma 7 — **DI**: tsyringe
- **Web**: Next.js 16 + MUI 9 — **Forms**: `@tanstack/react-form` + `zod/v4`
- **Docs**: Nextra 4
- **CLI**: .NET 10 (Native AOT) + Kiota-generated HTTP client
- **Shared**: `@depvault/shared` package in `packages/shared/`

## Layout

```text
apps/backend/    → Elysia REST API (port 4000)
apps/frontend/   → Next.js web app (port 4001)
apps/docs/       → Nextra documentation site (port 4002)
apps/cli/        → .NET 10 CLI (Native AOT)
packages/shared/ → Shared types & utils
```

## Commands

```bash
# Backend (cd apps/backend)
bun run dev / start / typecheck
bun test
bun run db:generate / db:migrate / db:migrate:apply
bun run build:types

# Web (cd apps/frontend)
bun run dev / build / start

# Docs (cd apps/docs)
bun run dev / build / start

# CLI (cd apps/cli)
dotnet build                                 # build CLI
dotnet publish -c Release -r win-x64         # AOT publish
bun run export:openapi                       # regenerate OpenAPI spec (from apps/backend)

# Root
bun run typecheck   # all workspaces
```

## PRD & Design References

- **PRD**: `docs/prd.md` — user stories US-01 through US-10, sprint plan, acceptance criteria
- **UI Mockups**: `docs/ui-mockups.md` — ASCII wireframes for every screen

## Scrum & Workflow

### Branch Naming

Format: `<type>/<issue-number>-<short-description>`

Types: `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`, `test/`

### Commit Messages

Conventional Commits: `<type>(scope): <description>` with `Refs #<issue-number>`

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`

Scopes: `backend`, `frontend`, `shared`, `db`, `ci`

### Pull Requests

1. Branch from `main`, commit with `Refs #N`
2. PR title matches commit convention, body has `## Summary`, `## Test plan`, `Closes #N`
3. Squash merge after CI passes

## Code Style

- Don't add inline comments that restate what the code does. Only comment **why**.
- Add brief JSDoc for public functions
- Aim for ~300–350 LOC per file. Extract when a file grows past this.
- Don't use `any` — use `unknown` and narrow, or define proper interfaces.
- Don't commit `.env` files or any file containing real secrets.
