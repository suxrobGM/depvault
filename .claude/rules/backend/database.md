---
paths:
  - "apps/backend/"
---

# Database Conventions

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
