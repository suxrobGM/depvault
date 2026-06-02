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

A class is **static** only when it is pure: stateless, deterministic, and free of IO, network,
subprocess, or rendering. Examples kept static: `VaultCrypto`, `AppRootResolver`, `EnvSlugResolver`,
`EcosystemResolver`, `BinaryDetector`, `PlaceholderFilter`, `SecretPatterns`, `FormatUtils`,
`RegexPatterns`, `Constants`, `ConsoleTheme`, `CommandUtils`.

Anything with state, IO, network, a subprocess, or rendering is a **DI service** (interface +
singleton registered in `Startup.cs`): e.g. `IRepositoryLocator`, `IProjectContextResolver`,
`RepoFileUploadService`, `DekService`, `IConfigService`, `ICredentialStore`, `IFileScanner`.

**Presentation boundary:** errors/success/structured output go through `IOutputFormatter` /
`ConsoleRenderer`. Transient `AnsiConsole.Status` spinners and `IConsolePrompter` prompts may stay
inline in command handlers (Spectre widgets can't be meaningfully abstracted), but services return
results/errors rather than rendering them.

**AOT:** constructor injection only — no new reflection and no new `JsonSerializerContext` entries.

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
- `DekService` checks cache before prompting for password or fetching from API
- Auto-creates SELF key grants when none exist (no more "go to web dashboard" error)

## Client-Side Encryption (`Crypto/`)

- `VaultCrypto.cs` — static methods: `Encrypt`, `Decrypt`, `EncryptBytes`, `DecryptBytes`, `DeriveKek` (PBKDF2), `DeriveCiWrapKey` (HKDF), `UnwrapKey`, `WrapKey`
- `DekService.cs` — DI-injectable service that resolves the project DEK:
  - **CI token mode**: fetches `/api/ci/secrets`, derives CI wrap key via HKDF, unwraps DEK
  - **JWT mode**: uses cached KEK from `VaultState`, or prompts for vault password (or reads `DEPVAULT_PASSWORD` env var), fetches KEK salt from `/api/vault/status`, derives KEK, fetches key grant from `/api/projects/:id/keygrants/my`, unwraps DEK
  - **Auto SELF grant**: on 404 key grant, generates DEK, wraps with KEK, POSTs to `/api/projects/:id/keygrants`
- All encryption/decryption happens locally — backend returns only ciphertext
- Files are encrypted as **whole-file blobs** (one ciphertext per file), never parsed into per-variable entries. Config files and secret files share one `RepoFile` model distinguished by a `kind` (`CONFIG` | `SECRET`)
- Push (`Services/RepoFileUploadService.cs`): for each discovered file, set `kind` from the scanner's classification, infer the owning App via `AppRootResolver` (nearest-ancestor project-marker walk; loose files fall back to the repo-root App) and the environment slug via `EnvSlugResolver` (from the filename), read the whole file, encrypt the bytes with the project DEK, and upload the blob to `POST /api/projects/:id/files/push`. No parsing into variables and no stale-variable pruning
- Pull (`Services/RepoFilePuller.cs`): **byte-faithful** — fetch the repo map + blobs, unwrap DEK, decrypt, and write each file verbatim to its original repo-relative path (recreating directories). No re-serialization
- CI pull: token scoped to `(app, environment)`; `GET /api/ci/secrets` returns `{ wrappedDek*, files[] }` (base + selected environment, each entry carrying its `kind`), decrypted client-side and written to exact paths

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
