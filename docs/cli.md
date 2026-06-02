# DepVault CLI Reference

The DepVault CLI is a .NET 10 command-line tool that provides the same core functionality as the web dashboard: authentication, repo-native config and secret file sync, dependency analysis, and config format conversion. It mirrors your repository — `push` uploads each config/secret file as a single client-encrypted blob, and `pull` restores every file byte-for-byte to its original repo-relative path. All encryption and decryption happen client-side; the server only ever sees ciphertext.

## Quick Install

```bash
# Linux / macOS
curl -fsSL https://get.depvault.com | bash

# Windows (PowerShell)
irm https://get.depvault.com | iex
```

The installer downloads the latest release binary and adds it to `~/.depvault/bin/`.

## Build from Source

Prerequisites: [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)

```bash
# Restore .NET local tools (includes Kiota for API client generation)
dotnet tool restore

# Build the CLI
cd apps/cli
dotnet build
```

### Publish (Native AOT)

```bash
# Publish a self-contained AOT binary
dotnet publish -c Release -r win-x64    # Windows
dotnet publish -c Release -r linux-x64  # Linux
dotnet publish -c Release -r osx-arm64  # macOS Apple Silicon
```

The compiled binary is in `apps/cli/bin/Release/net10.0/<rid>/publish/depvault`.

## Interactive Mode (REPL)

Run `depvault` with no arguments to enter an interactive session with a persistent banner, vault status, and command prompt. The vault auto-locks after 30 minutes of idle time.

```bash
depvault
```

## Configuration

The CLI stores configuration in `~/.depvault/`:

| File               | Purpose                                       |
| ------------------ | --------------------------------------------- |
| `config.json`      | API server URL, active project, output format |
| `credentials.json` | JWT access and refresh tokens                 |

### Set API server

```bash
depvault config set server https://depvault.example.com
```

## Authentication

### Interactive login

```bash
depvault login
# or with flags:
depvault login --email user@example.com --password secret --server https://api.example.com
```

### CI/CD token

Set the `DEPVAULT_TOKEN` environment variable with a CI token generated from the web dashboard. When set, the CLI operates in CI mode and uses the token for all requests.

```bash
export DEPVAULT_TOKEN=dvci_abc123...
depvault ci pull
```

### Check auth status

```bash
depvault whoami
```

## Vault Unlock / Lock

Unlock the vault to cache the KEK derived from your vault password. Subsequent commands skip the password prompt.

```bash
depvault unlock
depvault lock
```

In non-interactive mode, set `DEPVAULT_PASSWORD` to unlock automatically.

## Commands

### Project Management

```bash
depvault project list                   # List all projects
depvault project select <id>            # Set active project
depvault project info [id]              # Show project details
```

The CLI auto-detects the active project from the git remote origin URL when run inside a repository.

### Config & Secret Files

DepVault stores each config and secret file as a single client-encrypted blob, organized as Project (repo) → App (service folder) → ConfigFile / SecretFile. The CLI infers the owning app and environment automatically — you never pass a vault, tag, or format.

```bash
# Push config & secret files as encrypted blobs.
# With no --file, discovers all pushable files in the repo and prompts (all selected by default).
depvault push

# Push a single file
depvault push --file apps/api/appsettings.Production.json

# Pull and restore every config & secret file byte-for-byte to its original path
depvault pull

# Restore only one app's prod files (base files are included unless you opt out)
depvault pull --app api --environment prod
depvault pull --app api --environment prod --include-base=false

# List stored config files (optionally filter by app or environment slug)
depvault env list --app <appId> --environment staging

# List stored secret file metadata
depvault secrets list --environment prod
```

**How `push` infers app and environment:**

- **App** — walks up from each file toward the repo root and picks the nearest ancestor directory containing a project marker (`.sln`, `*.csproj`, `package.json`, `go.mod`, `Cargo.toml`, etc.). That directory's repo-relative path becomes the app's `appPath`. Files at the repo root map to the root app.
- **Environment slug** — derived from the filename: `appsettings.json` / bare `.env` → `base`; `appsettings.Production.json` → `prod`, `.env.local` → `local`, `.env.development` → `dev`, etc. Unknown segments keep their own slug (e.g. `.env.qa` → `qa`) — they are never collapsed to `base`.

The whole file is encrypted and uploaded verbatim — there is no parsing into individual variables and no stale-variable pruning. Each push snapshots the prior content as a version.

**Pull options:**

| Flag                | Default   | Description                                                        |
| ------------------- | --------- | ------------------------------------------------------------------ |
| `--project`         | active    | Project ID                                                         |
| `--app`             | all       | Restore only this app (matches app name or path)                   |
| `--environment`     | all       | Restore only this environment slug (e.g. `dev`, `prod`, `staging`) |
| `--include-base`    | `true`    | Also include `base` files when filtering by `--environment`        |
| `--include-secrets` | `true`    | Also restore secret files                                          |
| `--output-dir`      | repo root | Base directory to restore into                                     |
| `--force`           | off       | Overwrite existing files without prompting                         |

`pull` is byte-faithful: it fetches the repo map plus the encrypted blobs, decrypts each with the project DEK client-side, and writes the file verbatim to its original repo-relative path, recreating directories as needed. No re-serialization, no format conversion.

### Dependency Analysis

```bash
# Analyze a dependency file (ecosystem auto-detected from filename)
depvault analyze --file package.json

# Specify ecosystem explicitly
depvault analyze --file deps.txt --ecosystem PYTHON
```

Supported ecosystems: `NODEJS`, `PYTHON`, `DOTNET`, `RUST`, `GO`, `KOTLIN`, `JAVA`, `RUBY`, `PHP`

### CI/CD Secrets

`depvault ci pull` authenticates with a CI token (`DEPVAULT_TOKEN`) scoped to a single app + environment. It fetches that app's `base` and selected-environment config and secret blobs, unwraps the project DEK from the token, decrypts client-side, and restores each file to its exact repo-relative path.

```bash
# Restore all of the token's config & secret files into the current directory
depvault ci pull

# Restore into a specific directory and print a JSON summary of written files
depvault ci pull --output ./app --format json
```

| Flag       | Default | Description                                                            |
| ---------- | ------- | ---------------------------------------------------------------------- |
| `--output` | cwd     | Directory to restore files into                                        |
| `--format` | `text`  | Summary format (`text` or `json`) — describes which files were written |

No plaintext is ever written to the server, and no `.env` file is committed in CI — the runner fetches ciphertext on demand and decrypts in memory.

### Output Formats

List commands (`env list`, `secrets list`, `project list`) support `--output table` (default) or `--output json` for machine-readable output. Note that for `pull` and `ci pull`, `--output` / `--output-dir` instead set the directory files are restored into.

## Regenerating the API Client

When backend API endpoints change, regenerate the Kiota client:

```bash
# 1. Export the OpenAPI spec from the running backend
cd apps/backend
bun run export:openapi

# 2. Regenerate the client
cd ../..
dotnet kiota generate -l CSharp \
  -d apps/cli/openapi.json \
  -o apps/cli/ApiClient \
  -n DepVault.Cli.ApiClient \
  --exclude-backward-compatible
```
