---
description: Database conventions for Prisma schema and queries
paths: [apps/backend/prisma/**, apps/backend/src/**]
---

# Database Conventions

## Schema

- **ORM**: Prisma 7 with PostgreSQL driver adapter (`@prisma/adapter-pg`)
- **Schema location**: `apps/backend/prisma/schema/` (multi-file via `prismaSchemaFolder`)

## Model Rules

- **IDs**: UUID for all primary keys
- **Money**: `Decimal(12,2)` for prices, `Decimal(14,2)` for balances/totals
- **Soft deletes**: `deletedAt DateTime?` on User and Message models
- **Timestamps**: every model must have `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`

## Storage Models (repo-native)

Hierarchy: `Project` (a repo) → `App` (a service root) → `ConfigFile` / `SecretFile`. There is no `Vault` or `EnvVariable` model — config/secret files are stored as whole encrypted blobs, not per-variable rows.

- `App` — one service root per `(projectId, appPath)`; `appPath` is the repo-relative folder
- `ConfigFile` — one encrypted blob per `(appId, relativePath)`; `environmentSlug` is an open-set string column (`base`, `dev`, `prod`, `staging`, `local`, `test`, or custom), not a separate table
- `ConfigFileVersion` — full-blob snapshot per push/save; supports restore-to-version
- `SecretFile` / `SecretFileVersion` — same shape, keyed by `(appId, relativePath)`, with versioning + rollback

## Encryption Models

- `UserVault` — stores user's KEK salt, ECDH public key, wrapped private key, recovery key hash
- `ProjectKeyGrant` — stores wrapped DEK per user per project, with grant type (`SELF`, `ECDH`, `RECOVERY`)
- `CiToken` — scoped to `(appId, environmentSlug)`; includes `wrappedDek`/`wrappedDekIv`/`wrappedDekTag` for CI pipeline decryption
- Encrypted data fields (`encryptedContent`, `iv`, `authTag`) store client-encrypted ciphertext as-is

## Workflow

```bash
bun run db:generate       # After schema edits — regenerate client
bun run db:migrate        # Create migration file
bun run db:migrate:apply  # Apply pending migrations
```
