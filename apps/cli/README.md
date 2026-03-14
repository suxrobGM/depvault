# DepVault CLI

A .NET 10 command-line tool for DepVault — dependency analysis, environment variable management, and secret sharing. Compiled with Native AOT for fast startup and small binary size.

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- Backend running at `http://localhost:4000` (or configure with `depvault config set server <url>`)

## Quick Start

```bash
# From the repo root — restore the Kiota tool
dotnet tool restore

# Generate the API client from the backend's OpenAPI spec
cd apps/backend
bun run export:openapi

# Generate the typed C# client
cd ../..
dotnet kiota generate -l CSharp \
  -d apps/cli/openapi.json \
  -o apps/cli/ApiClient \
  -n DepVault.Cli.ApiClient \
  --exclude-backward-compatible

# Build
cd apps/cli
dotnet build

# Run
dotnet run -- --help
```

## Publish (Native AOT)

```bash
dotnet publish -c Release -r win-x64      # Windows
dotnet publish -c Release -r linux-x64    # Linux
dotnet publish -c Release -r osx-arm64    # macOS Apple Silicon
```

## Project Structure

```text
apps/cli/
├── Program.cs              # Entry point, DI container, command registration
├── Constants.cs          # Shared constants (env var names, paths)
├── Auth/
│   ├── ApiClientFactory.cs  # Creates Kiota API client instances
│   ├── AuthContext.cs       # Resolves auth mode (JWT vs CI token)
│   └── TokenAuthProvider.cs # Kiota auth provider (Bearer token)
├── Commands/
│   ├── CommandHelpers.cs    # Shared helpers (project ID, file validation, enum parsing)
│   ├── AuthCommands.cs      # login, logout, whoami
│   ├── ConfigCommands.cs    # config set/get
│   ├── ProjectCommands.cs   # project list/select/info
│   ├── EnvCommands.cs       # env pull/push/list/diff
│   ├── AnalysisCommands.cs  # analyze
│   ├── ConvertCommands.cs   # convert
│   └── CiCommands.cs        # ci pull
├── Config/
│   ├── AppConfig.cs         # ~/.depvault/config.json management
│   └── CredentialStore.cs   # ~/.depvault/credentials.json management
├── Output/
│   └── OutputFormatter.cs   # Table, JSON, and file output
├── ApiClient/               # Kiota-generated (gitignored)
└── openapi.json             # Exported OpenAPI spec (gitignored)
```

## Commands

```text
depvault login [--email] [--password] [--server]
depvault logout
depvault whoami
depvault config set <key> <value>
depvault config get <key>
depvault project list [--output table|json]
depvault project select <id>
depvault project info [--project <id>]
depvault env pull [--project] [--vault-group] [--environment] [--format] [--output]
depvault env push --vault-group <id> --file <path> [--project] [--environment] [--format]
depvault env list [--project] [--vault-group] [--environment] [--output]
depvault env diff --vault-group <id> --environments <DEVELOPMENT,PRODUCTION> [--project]
depvault analyze --file <path> [--project] [--ecosystem] [--output]
depvault convert --file <path> --from <format> --to <format> [--output]
depvault ci pull [--format env|json] [--output]
depvault version
```

## Authentication

**Interactive login** stores JWT tokens in `~/.depvault/credentials.json`:

```bash
depvault login
```

**CI/CD mode** uses the `DEPVAULT_TOKEN` environment variable (generated from the web dashboard):

```bash
export DEPVAULT_TOKEN=dvt_abc123...
depvault ci pull --output .env
```

## Regenerating the API Client

When backend endpoints change:

```bash
cd apps/backend && bun run export:openapi && cd ../..
dotnet kiota generate -l CSharp \
  -d apps/cli/openapi.json \
  -o apps/cli/ApiClient \
  -n DepVault.Cli.ApiClient \
  --exclude-backward-compatible
```

For full documentation, see [docs/cli.md](../../docs/cli.md).
