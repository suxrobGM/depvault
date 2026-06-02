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

Hierarchy: `Project` (a repo) → `App` (a service root) → `RepoFile`. There is no `Vault` or `EnvVariable` model — files are stored as whole encrypted blobs, not per-variable rows. Config files and secret files share one `RepoFile` model.

- `App` — one service root per `(projectId, appPath)`; `appPath` is the repo-relative folder
- `RepoFile` — one encrypted blob per `(projectId, relativePath)` (the identity anchor; `appId` is a mutable grouping pointer, so re-parenting a file keeps the same row + history). `kind` is `CONFIG` or `SECRET`. `environmentSlug` is an open-set string column (`base`, `dev`, `prod`, `staging`, `local`, `test`, or custom), not a separate table. CONFIG rows carry `format` (parse hint), SECRET rows carry `mimeType` (serve hint)
- `RepoFileVersion` — full-blob snapshot per push/save; supports restore-to-version

## Encryption Models

- `UserVault` — stores user's KEK salt, ECDH public key, wrapped private key, recovery key hash
- `ProjectKeyGrant` — stores wrapped DEK per user per project, with grant type (`SELF`, `ECDH`, `RECOVERY`)
- `CiToken` — scoped to `(appId, environmentSlug)`; includes `wrappedDek`/`wrappedDekIv`/`wrappedDekTag` for CI pipeline decryption
- `ShareLink` — one-time encrypted file share; stores the client-encrypted payload and auto-expires/consumes on access (the ephemeral decryption key lives in the URL fragment, never sent to the server)
- Encrypted data fields (`encryptedContent`, `iv`, `authTag`) store client-encrypted ciphertext as-is

## Workflow

```bash
bun run db:generate       # After schema edits — regenerate client
bun run db:migrate        # Create migration file
bun run db:migrate:apply  # Apply pending migrations
```
