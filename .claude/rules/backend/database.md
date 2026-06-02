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

Hierarchy: `Project` (a repo) → `App` (a service root) → `RepoFile`. Files are whole encrypted blobs, not per-variable rows — there is no `Vault` or `EnvVariable` model. Config and secret files share one `RepoFile`.

- `App` — one service root per `(projectId, appPath)`; `appPath` is the repo-relative folder
- `RepoFile` — one blob per `(projectId, relativePath)` (the identity anchor; `appId` is a mutable grouping pointer, so re-parenting keeps the same row + history). `kind` = `CONFIG` | `SECRET`. `environmentSlug` is an open-set string column (`base`/`dev`/`prod`/`staging`/`local`/`test`/custom), not a table. CONFIG rows carry `format` (parse hint); SECRET rows carry `mimeType` (serve hint)
- `RepoFileVersion` — full-blob snapshot per push/save; supports restore-to-version

## Encryption Models

- `UserVault` — KEK salt, ECDH public key, wrapped private key, recovery key hash
- `ProjectKeyGrant` — wrapped DEK per user per project; grant type `SELF` | `ECDH` | `RECOVERY`
- `CiToken` — scoped to `(appId, environmentSlug)`; carries `wrappedDek`/`wrappedDekIv`/`wrappedDekTag` for CI decryption
- `ShareLink` — one-time encrypted share; auto-expires/consumes on access (ephemeral key in URL fragment, never sent to server)
- `encryptedContent`/`iv`/`authTag` fields store client ciphertext as-is

## Workflow

```bash
bun run db:generate       # After schema edits — regenerate client
bun run db:migrate        # Create migration file
bun run db:migrate:apply  # Apply pending migrations
```
