---
description: End-to-end encryption architecture and security rules
---

# End-to-End Encryption

All secrets (env variables, secret files) are encrypted client-side. The server stores only ciphertext and cannot decrypt user data.

## Key Hierarchy

```text
Vault Password (user-memorized, never sent to server)
  → PBKDF2-SHA256 (600k iterations) → KEK (Key Encryption Key)
    → wraps ECDH P-256 private key (team sharing)
    → wraps per-project DEKs (Data Encryption Keys)
      → AES-256-GCM encrypt/decrypt of secrets

Recovery Key (random 256-bit, shown once at vault setup)
  → independently wraps each project DEK
```

## Key Files

| Layer    | File                                             | Purpose                                                  |
| -------- | ------------------------------------------------ | -------------------------------------------------------- |
| Frontend | `apps/frontend/src/lib/crypto.ts`                | WebCrypto: encrypt, decrypt, key wrapping, ECDH, HKDF    |
| Frontend | `apps/frontend/src/providers/vault-provider.tsx` | Vault state, DEK caching, key distribution               |
| Frontend | `apps/frontend/src/hooks/use-vault.ts`           | `useVault()` hook for components                         |
| Backend  | `apps/backend/src/modules/vault/`                | Vault API: setup, status, password, recovery, key grants |
| Backend  | `apps/backend/prisma/schema/vault.prisma`        | `UserVault` + `ProjectKeyGrant` models                   |
| CLI      | `apps/cli/Crypto/VaultCrypto.cs`                 | .NET AES-256-GCM, PBKDF2, HKDF                           |
| CLI      | `apps/cli/Crypto/DekResolver.cs`                 | Resolves DEK for pull/push (vault password or CI token)  |

## Data Flows

- **Env variables**: Client encrypts value → sends `{encryptedValue, iv, authTag}` → backend stores as-is
- **Secret files**: Client encrypts file → sends base64 `{encryptedContent, iv, authTag}` → backend stores as bytes
- **Share links**: Client encrypts with ephemeral key → key in URL fragment (`#key=`) never reaches server
- **CI tokens**: Client wraps DEK with HKDF-derived key from token → CLI/CI unwraps and decrypts locally
- **Team sharing**: ECDH P-256 key agreement → granter wraps DEK with shared secret → recipient unwraps

## Security Rules

- Backend must **never** encrypt or decrypt user secrets
- Vault password never leaves the client; KEK derived locally via PBKDF2
- Project DEKs wrapped per-user (SELF grant) or per-member (ECDH grant) — never stored in plaintext
- One-time share links use ephemeral keys in URL fragments; the server never sees the decryption key
- Never log decrypted secret values
