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

## Auth Modes

- JWT mode: credentials stored in `~/.depvault/credentials.json` (interactive users)
- CI token mode: `DEPVAULT_TOKEN` env var (CI/CD pipelines)
- CI token mode blocks interactive login

## Config

- Config stored in `~/.depvault/config.json` (server, project, output)
- Config service: `IConfigService` for reading/writing config

## Client-Side Encryption (`Crypto/`)

- `VaultCrypto.cs` — static methods: `Encrypt`, `Decrypt`, `DeriveKek` (PBKDF2), `DeriveCiWrapKey` (HKDF), `UnwrapKey`, `DecryptBytes`
- `DekResolver.cs` — DI-injectable service that resolves the project DEK:
  - **CI token mode**: fetches `/api/ci/secrets`, derives CI wrap key via HKDF, unwraps DEK
  - **JWT mode**: prompts for vault password (or reads `DEPVAULT_PASSWORD` env var), fetches KEK salt from `/api/vault/status`, derives KEK, fetches key grant from `/api/projects/:id/keygrants/my`, unwraps DEK
- All encryption/decryption happens locally — backend returns only ciphertext
- Pull: fetch encrypted entries → unwrap DEK → decrypt each value → serialize → write to disk
- Push: parse local file → encrypt each value → send encrypted entries to import endpoint

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
