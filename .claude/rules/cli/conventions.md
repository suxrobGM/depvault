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

## Static vs DI

- **Static** only when pure: stateless, deterministic, no IO/network/subprocess/rendering. E.g. `VaultCrypto`, `AppRootResolver`, `EnvSlugResolver`, `EcosystemResolver`, `BinaryDetector`, `PlaceholderFilter`, `SecretPatterns`, `FormatUtils`, `RegexPatterns`, `Constants`, `ConsoleTheme`, `CommandUtils`
- **DI service** (interface + singleton in `Startup.cs`) for anything with state, IO, network, subprocess, or rendering. E.g. `IRepositoryLocator`, `IProjectContextResolver`, `RepoFileUploadService`, `DekService`, `IConfigService`, `ICredentialStore`, `IFileScanner`
- **Presentation boundary:** errors/success/structured output go through `IOutputFormatter` / `ConsoleRenderer`. Services return results/errors, not rendered output; transient `AnsiConsole.Status` spinners and `IConsolePrompter` prompts may stay inline in handlers
- **AOT:** constructor injection only — no new reflection, no new `JsonSerializerContext` entries

## Project layout

Folders encode the static-vs-DI rule:

- `Common/` — pure static helpers (`FormatUtils`, `RegexPatterns`, `ExcludedDirectories`, `CommandUtils`).
- `Services/` — injectable services: `RepositoryLocator`, `ProjectContextResolver`, `RepoFileUploadService`, `RepoFilePuller`, `AppResolver`, `FileArgResolver`, `FileScanner`, etc. `Services/Scan/` holds the scan-step services; `Services/SecretScanning/` the leak-detection filters.
- `Crypto/` — `VaultCrypto` (static primitives), `DekService`, `VaultState`.
- `Output/` — rendering: `OutputFormatter`, `ConsoleRenderer`, `ConsolePrompter`, `ErrorHandler` + static `ApiErrorHandler`, `ConsoleTheme`.
- `Auth/` — session/auth services: `AuthContext`, `ApiClientFactory`, `TokenAuthProvider`, `TokenRefreshHandler`.
- `Config/` — `ConfigService` + `CredentialStore`.
- `Commands/` — thin `System.CommandLine` factory classes (`*Commands`, `RootHandler`, `ProjectGuard`); business logic lives in `Services/`.
- `Repl/` — interactive REPL host.

## Auth & Config

- **JWT mode**: credentials in `~/.depvault/credentials.json` (interactive users)
- **CI token mode**: `DEPVAULT_TOKEN` env var (CI/CD); blocks interactive login
- Config (server, project, output) in `~/.depvault/config.json` via `IConfigService`

## Vault State (`Crypto/VaultState.cs`)

- Singleton holding KEK, per-project DEK cache, auto-lock timer
- `Unlock(kek)` caches KEK; `Lock()` zeros memory via `CryptographicOperations.ZeroMemory`
- `DekService` checks cache before prompting/fetching; auto-creates SELF grants when none exist

## Persisted Unlock (`Crypto/PersistentVaultStore.cs`, `Crypto/KekProtector.cs`)

- **Opt-in** persistence so the password isn't retyped each invocation. The vault **password is never stored** — only the derived KEK, encrypted at rest via `IKekProtector` (`WindowsKekProtector` = DPAPI `CurrentUser`; `PosixKekProtector` = AES-GCM under an owner-only `vault-protector.key`)
- `IPersistentVaultStore` writes `~/.depvault/vault-session.json` (`{ protectedKek, kekSalt, expiresAt }`, source-gen JSON). `TryLoad` returns null on missing/corrupt/expired/unprotect-fail (clearing stale sessions); `HasSession` is a cheap existence+expiry check (no unprotect) for the banner and prompt guards
- `DekService` loads a valid session transparently into `VaultState` (salt-mismatch or `VerifyKek` failure ⇒ drop + fall back to password). Opt-in happens via the post-unlock prompt or `unlock --remember [--ttl 7d]` (default 7d, max 30d, parsed by `Common/DurationParser`). `lock`/`logout` call `Clear()`

## Client-Side Encryption (`Crypto/`)

- `VaultCrypto.cs` (static): `Encrypt`/`Decrypt`/`EncryptBytes`/`DecryptBytes`, `DeriveKek` (PBKDF2), `DeriveCiWrapKey` (HKDF), `WrapKey`/`UnwrapKey`
- `DekService.cs` resolves the project DEK:
  - **CI token**: fetch `/api/ci/secrets` → HKDF wrap key → unwrap DEK
  - **JWT**: cached KEK from `VaultState`, else prompt for password (or `DEPVAULT_PASSWORD`) → KEK salt from `/api/vault/status` → derive KEK → grant from `/api/projects/:id/keygrants/my` → unwrap DEK
  - **Auto SELF grant**: on 404, generate DEK, wrap with KEK, POST to `/api/projects/:id/keygrants`
- All encrypt/decrypt is local — backend returns only ciphertext
- Files are **whole-file blobs** (one ciphertext each), never parsed into variables. Config + secret files share one `RepoFile`, distinguished by `kind` (`CONFIG` | `SECRET`)
- **Push** (`Services/RepoFileUploadService.cs`): per file, set `kind` from the scanner, infer owning App via `AppRootResolver` (nearest project-marker; loose files → repo-root App) and slug via `EnvSlugResolver` (filename), encrypt the bytes with the DEK, `POST /api/projects/:id/files/push`. No variable parsing or pruning
- **Pull** (`Services/RepoFilePuller.cs`): **byte-faithful** — fetch map + blobs, unwrap DEK, decrypt, write each file verbatim to its repo-relative path (recreating dirs). No re-serialization
- **Purge** (`Services/RepoFilePurger.cs`): inverse of pull — fetch the map, compute the same file set + paths via `Common/RepoFileSelection` (the pure selection/path helper shared with pull), and delete those present on disk (no DEK/decrypt). Destructive: previews + confirms (defaults No), requires `--force` non-interactively, supports `--dry-run`/`--no-prune`
- **CI pull**: token scoped to `(app, environment)`; `GET /api/ci/secrets` returns `{ wrappedDek*, files[] }` (base + selected env, each with its `kind`), decrypted client-side to exact paths

## Regenerating API Client

`bun run export:openapi` (in apps/backend) → copy to `apps/cli/openapi.json` → run:

```bash
dotnet kiota generate -l CSharp \
  -d apps/cli/openapi.json \
  -o apps/cli/ApiClient \
  -n DepVault.Cli.ApiClient \
  --exclude-backward-compatible
```

## Build

- `dotnet build` (dev); `dotnet publish -c Release -r <rid>` for AOT binary (linux-x64, osx-x64, osx-arm64, win-x64)
