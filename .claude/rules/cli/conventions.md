---
description: CLI conventions for .NET 10 Native AOT CLI
paths: [apps/cli/**]
---

# CLI Conventions

## Architecture

- .NET 10 with Native AOT compilation
- System.CommandLine for CLI framework
- Kiota-generated HTTP client from OpenAPI spec

## Auth Modes

- JWT mode: credentials stored in `~/.depvault/credentials.json` (interactive users)
- CI token mode: `DEPVAULT_TOKEN` env var (CI/CD pipelines)
- CI token mode blocks interactive login

## Config

- Config stored in `~/.depvault/config.json` (server, project, output)
- Config service: `IConfigService` for reading/writing config

## Regenerating API Client

- Run `bun run export:openapi` in apps/backend to export spec
- Run `dotnet kiota generate` to regenerate C# client from openapi.json

## Build

- `dotnet build` for development
- `dotnet publish -c Release -r <rid>` for Native AOT binary (linux-x64, osx-x64, osx-arm64, win-x64)
