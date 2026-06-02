---
description: End-to-end encryption architecture and security rules
---

# End-to-End Encryption

All user files (config files and secret files, unified as one `RepoFile` model distinguished by `kind`) are encrypted client-side. Each file is stored as one client-encrypted blob — the server stores only ciphertext and cannot decrypt user data.

## Key Hierarchy

```text
Vault Password (user-memorized, never sent to server)
  → PBKDF2-SHA256 (600k iterations) → KEK (Key Encryption Key)
    → wraps ECDH P-256 private key (team sharing)
    → wraps recovery key (stored in UserVault)
    → wraps per-project DEKs via SELF grants
      → AES-256-GCM encrypt/decrypt of secrets

Recovery Key (random 256-bit, shown once at vault setup)
  → wrapped by KEK, stored in UserVault
  → independently wraps each project DEK via RECOVERY grants
  → used to restore vault access when password is forgotten
```

## Key Files

| Layer    | File                                                         | Purpose                                                                                                         |
| -------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Frontend | `apps/frontend/src/lib/crypto/`                              | WebCrypto modules: encoding, keys, AES-GCM, ECDH, etc.                                                          |
| Frontend | `apps/frontend/src/lib/crypto/vault-*.ts`                    | Vault operations: lifecycle, grants, re-keying                                                                  |
| Frontend | `apps/frontend/src/providers/vault-provider.tsx`             | Vault state, DEK caching, key distribution                                                                      |
| Frontend | `apps/frontend/src/hooks/use-vault.ts`                       | `useVault()` hook for components                                                                                |
| Backend  | `apps/backend/src/modules/vault/`                            | Vault API: setup, status, password, recovery, key grants                                                        |
| Backend  | `apps/backend/prisma/schema/vault.prisma`                    | Crypto models only: `UserVault` + `ProjectKeyGrant`                                                             |
| Backend  | `apps/backend/prisma/schema/app.prisma`                      | `App` (service root, keyed by `appPath`)                                                                        |
| Backend  | `apps/backend/prisma/schema/repo-file.prisma`                | `RepoFile`/`RepoFileVersion` (encrypted blobs; `kind` = CONFIG \| SECRET; keyed by `(projectId, relativePath)`) |
| Backend  | `apps/backend/prisma/schema/share-link.prisma`               | `ShareLink` (one-time encrypted file shares)                                                                    |
| CLI      | `apps/cli/Crypto/VaultCrypto.cs`                             | .NET AES-256-GCM, PBKDF2, HKDF                                                                                  |
| CLI      | `apps/cli/Crypto/DekService.cs`                              | Resolves project DEK for pull/push (vault password or CI token)                                                 |
| CLI      | `apps/cli/Services/RepoFileUploadService.cs`, `apps/cli/Commands/Pull/` | `RepoFileUploadService` (push), `RepoFilePuller` (pull) — whole-file blobs, `kind`-aware              |
| CLI      | `apps/cli/Services/AppRootResolver.cs`, `EnvSlugResolver.cs` | Infer owning App (project-marker walk) and environment slug (filename)                                          |

## Data Flows

- **Repo files** (config & secret): Client encrypts the whole file → sends base64 `{encryptedContent, iv, authTag}` plus `kind` → backend stores the blob as-is (no parsing into variables). Each push/save snapshots a `RepoFileVersion`
- **Share links**: Client encrypts with ephemeral key → key in URL fragment (`#key=`) never reaches server
- **CI tokens**: Client wraps DEK with HKDF-derived key from token → CLI/CI unwraps and decrypts locally
- **Team sharing**: ECDH P-256 key agreement → granter wraps DEK with shared secret → recipient unwraps
- **Recovery**: User provides recovery key → unwraps all RECOVERY grants → re-wraps DEKs under new KEK
- **Password change**: Fetches all SELF grants → re-wraps DEKs + private key + recovery key under new KEK

## Security Rules

- Backend must **never** encrypt or decrypt user secrets
- Vault password never leaves the client; KEK derived locally via PBKDF2
- Project DEKs wrapped per-user: SELF grant (KEK), RECOVERY grant (recovery key), or ECDH grant (shared secret)
- Recovery key is wrapped with KEK and stored in UserVault — never stored in plaintext
- One-time share links use ephemeral keys in URL fragments; the server never sees the decryption key
- Never log decrypted secret values
