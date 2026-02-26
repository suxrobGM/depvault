# DepVault

DepVault is a web dashboard that analyzes dependencies, detects vulnerabilities, and securely stores environment variables across any tech stack - from `package.json` to `.env` to `appsettings.json` - all in one place.

## Tech Stack

| Layer      | Technology              |
| ---------- | ----------------------- |
| Runtime    | Bun                     |
| Backend    | Elysia.js               |
| Frontend   | Next.js 16              |
| UI         | MUI 7 + Tailwind CSS v4 |
| Database   | PostgreSQL + Prisma 7   |
| DI         | tsyringe                |
| Auth       | JWT + GitHub OAuth      |
| Encryption | AES-256-GCM             |

## Project Structure

```text
depvault/
├── apps/
│   ├── backend/         # Elysia REST API (port 4000)
│   └── frontend/        # Next.js web app (port 4001)
├── packages/
│   └── shared/          # Shared types & utils
└── docs/                # PRD and documentation
```

## Prerequisites

- [Bun](https://bun.sh) v1.3+
- PostgreSQL 18+

## Getting Started

```bash
# Install dependencies
bun install

# Set up environment variables
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
# Edit both .env files with your values

# Generate Prisma client
cd apps/backend
bun run db:generate

# Push schema to database (development only)
bun run db:push

# Seed the database
bun run db:seed
```

## Development

```bash
# Backend (from apps/backend/)
bun run dev          # Start dev server with watch mode
bun run typecheck    # Type check

# Frontend (from apps/frontend/)
bun run dev          # Start Next.js dev server
bun run typecheck    # Type check
bun run lint         # Run ESLint
```

## Database

```bash
# From apps/backend/
bun run db:generate        # Regenerate Prisma client after schema changes
bun run db:push            # Push schema to DB (dev only)
bun run db:migrate         # Create a new migration file
bun run db:migrate:apply   # Apply pending migrations
bun run db:seed            # Seed the database
```

## Building

```bash
# Frontend
cd apps/frontend && bun run build

# Backend
cd apps/backend
bun run build:linux    # Linux binary
bun run build:win      # Windows binary
```
