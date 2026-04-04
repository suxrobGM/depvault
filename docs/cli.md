# DepVault CLI Reference

The DepVault CLI is a .NET 10 command-line tool that provides the same core functionality as the web dashboard: authentication, environment variable management, dependency analysis, and config format conversion.

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
depvault ci pull --output .env
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

### Environment Variables

```bash
# Pull env vars to a local file
depvault pull --environment PRODUCTION --format env --output .env

# Push a local file to the vault
depvault push --vault-group <id> --environment DEVELOPMENT --file .env

# List variables
depvault env list --environment STAGING

# List secret file metadata
depvault secrets list
```

Supported formats: `env`, `appsettings.json`, `secrets.yaml`, `config.toml`

### Dependency Analysis

```bash
# Analyze a dependency file (ecosystem auto-detected from filename)
depvault analyze --file package.json

# Specify ecosystem explicitly
depvault analyze --file deps.txt --ecosystem PYTHON
```

Supported ecosystems: `NODEJS`, `PYTHON`, `DOTNET`, `RUST`, `GO`, `KOTLIN`, `JAVA`, `RUBY`, `PHP`

### CI/CD Secrets

```bash
# Fetch secrets (requires DEPVAULT_TOKEN)
depvault ci pull --format env --output .env
depvault ci pull --format json
```

### Output Formats

Most commands support `--output table` (default) or `--output json` for machine-readable output.

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
