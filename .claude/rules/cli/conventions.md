---
description: CLI conventions for .NET 10 Native AOT CLI
paths: [apps/cli/**]
---

# CLI Conventions

## Architecture

- .NET 10 with Native AOT compilation
- System.CommandLine for CLI framework
- Kiota-generated HTTP client from OpenAPI spec
- Microsoft DI for dependency injection (`Startup.cs`)
- Spectre.Console for all UI rendering
- REPL mode with persistent banner and vault status and non-interactive mode for CI/CD

## Auth Modes

- JWT mode: credentials stored in `~/.depvault/credentials.json` (interactive users)
- CI token mode: `DEPVAULT_TOKEN` env var (CI/CD pipelines)
- CI token mode blocks interactive login

## Config

- Config stored in `~/.depvault/config.json` (server, project, output)
- Config service: `IConfigService` for reading/writing config

## Vault State (`Crypto/VaultState.cs`)

- Singleton holding KEK (`byte[]`), DEK cache (`Dictionary<string, byte[]>`), auto-lock timer
- `Unlock(kek)` caches KEK, `Lock()` zeros memory via `CryptographicOperations.ZeroMemory`
- `DekResolver` checks cache before prompting for password or fetching from API
- Auto-creates SELF key grants when none exist (no more "go to web dashboard" error)

## Client-Side Encryption (`Crypto/`)

- `VaultCrypto.cs` — static methods: `Encrypt`, `Decrypt`, `EncryptBytes`, `DecryptBytes`, `DeriveKek` (PBKDF2), `DeriveCiWrapKey` (HKDF), `UnwrapKey`, `WrapKey`
- `DekResolver.cs` — DI-injectable service that resolves the project DEK:
  - **CI token mode**: fetches `/api/ci/secrets`, derives CI wrap key via HKDF, unwraps DEK
  - **JWT mode**: uses cached KEK from `VaultState`, or prompts for vault password (or reads `DEPVAULT_PASSWORD` env var), fetches KEK salt from `/api/vault/status`, derives KEK, fetches key grant from `/api/projects/:id/keygrants/my`, unwraps DEK
  - **Auto SELF grant**: on 404 key grant, generates DEK, wraps with KEK, POSTs to `/api/projects/:id/keygrants`
- All encryption/decryption happens locally — backend returns only ciphertext
- Files are encrypted as **whole-file blobs** (one ciphertext per config/secret file), never parsed into per-variable entries
- Push (`Commands/Push/ConfigFilePusher.cs`, `SecretFilePusher.cs`): for each discovered file, infer the owning App via `AppRootResolver` (nearest-ancestor project-marker walk) and the environment slug via `EnvSlugResolver` (from the filename), read the whole file, encrypt the bytes with the project DEK, and upload the blob. No parsing into variables and no stale-variable pruning
- Pull (`Commands/Pull/ConfigFilePuller.cs`, `SecretFilePuller.cs`): **byte-faithful** — fetch the repo map + blobs, unwrap DEK, decrypt, and write each file verbatim to its original repo-relative path (recreating directories). No re-serialization
- CI pull: token scoped to `(app, environment)`; `GET /api/ci/secrets` returns `{ wrappedDek*, configFiles[], secretFiles[] }` (base + selected environment), decrypted client-side and written to exact paths

## Regenerating API Client

- Run `bun run export:openapi` in apps/backend to export spec
- Copy to `apps/cli/openapi.json`
- Run

```bash
dotnet kiota generate -l CSharp \
  -d apps/cli/openapi.json \
  -o apps/cli/ApiClient \
  -n DepVault.Cli.ApiClient \
  --exclude-backward-compatible
```

to regenerate C# client

## Build

- `dotnet build` for development
- `dotnet publish -c Release -r <rid>` for Native AOT binary (linux-x64, osx-x64, osx-arm64, win-x64)
