# Architecture Overview

## System Architecture

```text
                         ┌─────────────────────┐
                         │      Browser         │
                         └──────────┬───────────┘
                                    │ HTTPS
                         ┌──────────▼───────────┐
                         │   Nginx (reverse      │
                         │   proxy + TLS + gzip) │
                         └──┬───────────────┬────┘
                            │               │
                   /api/*   │               │  /*
                   /health  │               │  /_next/static
                            │               │
                 ┌──────────▼──┐    ┌───────▼──────────┐
                 │  Backend    │    │  Frontend         │
                 │  Elysia.js  │    │  Next.js 16       │
                 │  port 4000  │    │  port 4001        │
                 └──────┬──────┘    └──────────────────┘
                        │
              ┌─────────▼─────────┐
              │  PostgreSQL 18+   │
              │  (Prisma 7 ORM)   │
              └───────────────────┘
```

Nginx sits in front of both services on a single domain. Requests matching `/api/*` or `/health` are proxied to the Elysia backend. Everything else (pages, static assets) goes to the Next.js frontend. Auth endpoints (`/api/auth/login`, `/api/auth/register`, `/api/auth/reset-password`) are rate-limited at the Nginx layer (5 req/s with burst of 10).

---

## Monorepo Structure

```text
depvault/
├── apps/
│   ├── backend/         Elysia REST API (Bun runtime, port 4000)
│   ├── frontend/        Next.js 16 web app (MUI 7, port 4001)
│   └── cli/             .NET 10 Native AOT CLI
├── packages/
│   └── shared/          Shared TypeScript types and utilities
├── deploy/
│   ├── depvault.conf       Nginx site configuration
│   └── docker-compose.yml  Production container orchestration
└── .github/workflows/
    ├── ci.yml           Lint, typecheck, test, build, secret scan
    └── deploy.yml       Build Docker images and deploy to VPS
```

**apps/backend** -- Elysia.js API server. Handles authentication, project management, dependency analysis, environment variable vault, secret file storage, secret sharing, CI token management, secret scanning, and notifications. Uses Prisma 7 with PostgreSQL and tsyringe for dependency injection.

**apps/frontend** -- Next.js 16 App Router application. Uses React Server Components by default, MUI 7 for UI, TanStack Form + zod for form validation. TanStack Query for data fetching and caching. Auth state managed via React context with JWT stored in httpOnly cookies.

**apps/cli** -- .NET 10 command-line tool compiled with Native AOT and gzip compression. Provides terminal-based access to DepVault features including environment variable management, dependency scanning, and CI/CD integration. Produces a single self-contained native binary.

**packages/shared** -- TypeScript types and utility functions shared between backend and frontend. Published as `@depvault/shared` within the monorepo.

---

## Backend Module Pattern

Each feature module follows a consistent 3-file pattern with optional extras:

```text
modules/{feature}/
├── {feature}.controller.ts    Elysia route group (thin HTTP layer)
├── {feature}.service.ts       @singleton() class with business logic
├── {feature}.schema.ts        TypeBox (t.*) request/response schemas
├── {feature}.repository.ts    (optional) complex queries, raw SQL
├── {feature}.mapper.ts        (optional) Prisma model → API response
└── {feature}.service.test.ts  Unit tests with mocked Prisma
```

**Controller** -- Resolves the service via `container.resolve(ServiceClass)` and delegates all work. Defines routes, applies TypeBox validation schemas, and returns responses. Controllers are registered as Elysia plugins in `src/app.ts`.

**Service** -- `@singleton()` class injected with `PrismaClient`. Contains all business logic, validation, error handling, and encryption/decryption. Throws typed HTTP errors (`NotFoundError`, `BadRequestError`, etc.) that the global error middleware maps to responses.

**Schema** -- TypeBox (`t.*`) definitions for request bodies, query parameters, path parameters, and response shapes. Type aliases are grouped at the end of the file.

### Registered Modules

All modules are mounted under the `/api` group in `src/app.ts`:

- `auth` -- registration, login, logout, refresh, GitHub OAuth, email verification, password reset
- `project` -- CRUD, list with pagination
- `vaultGroup` -- vault organization within projects
- `environment` -- CRUD per project
- `envVariable` -- CRUD, bulk operations, version history
- `envDiff` -- side-by-side environment comparison
- `envIO` -- import/export in various formats
- `envBundle` -- download encrypted archives
- `envTemplate` -- create and apply environment templates
- `secretFile` -- upload, download, version history
- `secret` -- one-time link generation
- `sharedSecret` -- one-time link access
- `user` -- profile management
- `auditLog` -- project and global activity log
- `analysis` -- dependency file upload, parsing, vulnerability scanning
- `convert` -- format conversion between .env/json/yaml/toml
- `githubApi` -- GitHub integration endpoints
- `notification` -- user notification management
- `secretScan` -- git repository secret scanning
- `scanPattern` -- detection pattern management
- `ciToken` / `ciAccess` -- CI/CD token generation and secret access
- `licenseRule` -- license policy configuration
- `activity` -- activity feed
- `security` -- security dashboard overview

---

## Dependency Injection

DepVault uses **tsyringe** for constructor-based DI:

```text
┌─────────────┐     container.resolve()     ┌──────────────┐
│  Controller  │ ──────────────────────────► │   Service    │
└─────────────┘                              │ @singleton() │
                                             └──────┬───────┘
                                                    │ constructor inject
                                             ┌──────▼───────┐
                                             │ PrismaClient  │
                                             └──────────────┘
```

- **PrismaClient** is registered as an instance in `common/di/container.ts`
- **Services** use `@singleton()` or `@injectable()` decorators and receive `PrismaClient` (or a repository) via constructor injection
- **Repositories** (optional) are `@singleton()` classes containing complex Prisma queries
- **Controllers** call `container.resolve(ServiceClass)` to obtain service instances

---

## Database Schema

The database uses PostgreSQL with Prisma 7 (multi-file schema in `apps/backend/prisma/schema/`). All models use UUID primary keys, `createdAt`, and `updatedAt` timestamps.

### Entity Relationship Overview

```text
User ──────────┬──── Account (auth providers: EMAIL, GITHUB)
               │
               ├──── Project (owner)
               │       ├──── ProjectMember (OWNER / EDITOR / VIEWER)
               │       ├──── VaultGroup
               │       │       └──── Environment (DEV / STAGING / PROD / GLOBAL)
               │       │               ├──── EnvVariable
               │       │               │       └──── EnvVariableVersion
               │       │               ├──── SecretFile
               │       │               │       └──── SecretFileVersion
               │       │               └──── CiToken
               │       ├──── Analysis
               │       │       └──── Dependency (self-referencing tree)
               │       │               └──── Vulnerability
               │       ├──── EnvTemplate
               │       │       └──── EnvTemplateVariable
               │       ├──── SharedSecret
               │       ├──── AuditLog
               │       ├──── LicenseRule
               │       ├──── ScanPattern
               │       ├──── SecretScan
               │       │       └──── SecretDetection
               │       └──── SecretDetection
               │
               ├──── Notification
               └──── AuditLog
```

### Key Models

| Model                  | Purpose                                                                     |
| ---------------------- | --------------------------------------------------------------------------- |
| **User**               | Email/password or GitHub OAuth accounts, soft-deletable                     |
| **Account**            | Auth provider link (EMAIL or GITHUB) with refresh token family              |
| **Project**            | Top-level container owned by a user                                         |
| **ProjectMember**      | Role-based membership (OWNER, EDITOR, VIEWER)                               |
| **VaultGroup**         | Logical grouping of environments within a project                           |
| **Environment**        | DEVELOPMENT, STAGING, PRODUCTION, or GLOBAL scope                           |
| **EnvVariable**        | Encrypted key-value pair with IV and auth tag                               |
| **EnvVariableVersion** | Immutable version history for variable changes                              |
| **SecretFile**         | Encrypted binary file (certs, keys, keystores) with metadata                |
| **SecretFileVersion**  | Immutable version history for file changes                                  |
| **EnvTemplate**        | Reusable environment variable structure template                            |
| **SharedSecret**       | One-time encrypted share link (PENDING / VIEWED / EXPIRED)                  |
| **Analysis**           | Dependency analysis run for a specific file and ecosystem                   |
| **Dependency**         | Parsed package with version info, self-referencing tree for transitive deps |
| **Vulnerability**      | CVE record linked to a dependency (NONE through CRITICAL severity)          |
| **LicenseRule**        | Per-project license policy (ALLOW / WARN / BLOCK)                           |
| **AuditLog**           | Append-only log of secret-related actions with IP address                   |
| **CiToken**            | Scoped, short-lived CI/CD access token with IP allowlist                    |
| **ScanPattern**        | Regex pattern for git secret detection (built-in or custom)                 |
| **SecretScan**         | Git repository scan run with status tracking                                |
| **SecretDetection**    | Individual secret found in a commit (OPEN / RESOLVED / FALSE_POSITIVE)      |
| **Notification**       | User notification for various event types                                   |

---

## Authentication Flow

```text
                     Register                        Login
                        │                              │
                        ▼                              ▼
              Create User + Account          Verify email + password
              Send verification email               │
                        │                              ▼
                        ▼                     Issue JWT access token
              Click email link                (1 day expiry, httpOnly cookie)
              Set emailVerified=true           + refresh token (7 day expiry)
                        │                              │
                        ▼                              ▼
                   Redirect to login           Authenticated requests
                                                       │
                                                       ▼
                                              Token expired? ──► /api/auth/refresh
                                                                  Rotate refresh token
                                                                  Issue new access token
```

- **Access tokens** expire in 15 minutes and are stored in httpOnly cookies
- **Refresh tokens** expire in 7 days with rotation on every use (old token invalidated)
- **GitHub OAuth** creates or links an account and follows the same JWT flow after callback
- **Auth guard** is an Elysia `derive({ as: "scoped" })` plugin that verifies the JWT and injects a typed `user` object into the request context
- **Role guard** chains the auth guard and checks `user.role` for admin-level access

---

## Encryption Design

All environment variable values and secret file contents are encrypted at rest using AES-256-GCM.

```text
                    Plaintext value
                          │
                          ▼
              Generate random 12-byte IV
                          │
                          ▼
          AES-256-GCM encrypt with project key
                          │
                          ▼
              ┌───────────┼───────────┐
              │           │           │
         encrypted    12-byte IV   auth tag
          value       (Base64)     (Base64)
              │           │           │
              └───────────┼───────────┘
                          │
                          ▼
                  Store all three columns
                  in the database row
```

- **Key hierarchy**: Master key (from environment variable `MASTER_ENCRYPTION_KEY`) derives per-project encryption keys
- Each encrypted field stores three values: `encryptedValue` (or `encryptedContent` for files), `iv`, and `authTag`
- Decryption happens only in-memory for authorized API responses
- Secret values never appear in logs, error messages, or stack traces

---

## API Design

- **Protocol**: RESTful HTTP with JSON request/response bodies
- **Base path**: All endpoints are grouped under `/api`
- **Validation**: Every endpoint uses TypeBox (`t.*`) schemas for request and response validation via Elysia's built-in type system
- **Error handling**: Services throw typed HTTP errors (`NotFoundError`, `BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `ConflictError`) which the global error middleware converts to consistent JSON error responses
- **Swagger**: Auto-generated OpenAPI docs available at `/api/swagger`
- **Health check**: `GET /health` returns `{ status: "ok", timestamp: "..." }` (not behind auth guard)
- **CORS**: Configured via the `CORS_ORIGINS` environment variable
- **File uploads**: Handled via multipart form data with a 50 MB Nginx limit and 25 MB application-level limit
