# Building DepVault: a full-stack security platform with Bun, Elysia, and Next.js 16

If you've worked on a team where `.env` files get passed around in Slack DMs, you know the problem. I've been there. Three repos, three different stacks, and I'm running `npm audit`, `pip-audit`, and `dotnet list package --vulnerable` one after another just to get a rough picture of where things stand. Then there's the secrets side: someone pastes a database password in a group chat, it sits in the scroll history forever, and six months later nobody remembers which values are current.

I wanted one place for all of it. That became DepVault: a web dashboard for analyzing dependencies across 8+ ecosystems and storing secrets in an encrypted vault. It started as a class project, but I built it around a problem I actually had.

Live app: [depvault.suxrobgm.net](https://depvault.suxrobgm.net) | Source: [github.com/suxrobGM/depvault](https://github.com/suxrobGM/depvault)

![Dashboard](./images/dashboard.jpg)

## Architecture

The codebase is a monorepo with three packages: `apps/backend` (Elysia REST API on port 4000), `apps/frontend` (Next.js web app on port 4001), and `packages/shared` (TypeScript types and utilities used by both). The shared package is where API response types live, so the frontend and backend always agree on shapes.

I went with Bun as the runtime mostly for speed. Installs run about 3x faster than npm, and it executes TypeScript directly without a transpilation step. No `ts-node`, no `tsx`. In a monorepo with two apps and a shared package, that time savings is noticeable in CI.

For the backend, I picked Elysia.js over Express or Fastify because of TypeBox. Request bodies, query params, and response shapes are all defined as TypeBox schemas, so the validation logic and the TypeScript types come from the same source. Elysia's Eden Treaty takes this further: it generates a fully typed API client from the backend types. Change a response shape on the server and the frontend shows type errors immediately. No codegen step, no stale OpenAPI specs.

The frontend is Next.js 16 with React 19. Server components keep the client bundle small since only interactive pieces ship to the browser. React 19's compiler handles memoization on its own, which meant I could stop thinking about `useCallback` and `useMemo` and just write components. MUI 7 provides the design system.

Prisma 7 sits on top of PostgreSQL. The multi-file schema feature was a big draw: I split models by domain (`auth.prisma`, `projects.prisma`, `vault.prisma`) instead of maintaining one massive schema file. tsyringe handles dependency injection with `@singleton()` decorators, which keeps services easy to test with mocked dependencies.

## Key features

### Dependency analysis

Upload a `package.json`, `requirements.txt`, `go.mod`, or `Cargo.toml` and DepVault parses it, checks versions against the relevant package registry, and looks up each dependency in the OSV.dev vulnerability database. You get a table with current version, latest version, and any known CVEs.

![Dependency Analysis](./images/project-dependencies-2.jpg)

The parsers deal with ecosystem-specific quirks: npm version ranges (`^1.2.3` vs `~1.2.3`), Python's PEP 440 specifiers, Go module paths with major version suffixes. Each parser is its own module with tests covering valid input, malformed files, and edge cases.

### Encrypted vault

Each project has a vault for environment variables, organized by environment (development, staging, production). Values are encrypted with AES-256-GCM before they touch the database. There's a version history for each variable and a diff view for comparing environments side by side.

![Environment Vault](./images/project-env-vars.jpg)

![Variable History](./images/project-env-vars-history.jpg)

### Secret sharing

Instead of pasting a database password into Slack, you generate a one-time link. The recipient opens it, sees the value, and the content gets permanently deleted from the database. Links auto-expire after a time window you configure.

![Secret Sharing](./images/share-secret.jpg)

There's also CI/CD token generation for pulling secrets at build time, secret scanning with configurable regex patterns, a format converter (`.env` / JSON / YAML / TOML), and license compliance checking.

![CI Integration](./images/ci-integration.jpg)

## Security

"We encrypt everything" is easy to claim and hard to verify, so here are the specifics.

Every environment variable value is encrypted with AES-256-GCM. Each value gets its own randomly generated IV, and the authentication tag is stored alongside the ciphertext. The encryption key lives in server environment variables, never in the codebase. No plaintext in the database, no plaintext in API responses to unauthorized users, no plaintext in logs.

JWTs are stored in httpOnly cookies, not localStorage. If an XSS vulnerability gets through, JavaScript can't read httpOnly cookies. The browser sends them automatically. Refresh tokens rotate on each use: a token can only be used once, and using a revoked one invalidates the whole session.

Three roles (owner, editor, viewer) are enforced at the API layer through Elysia guard middleware. The auth guard verifies the JWT and injects a typed `user` object. The role guard chains on top and checks permissions. Controllers don't make authorization decisions.

One-time link tokens come from `crypto.randomUUID()` (cryptographically random, not `Math.random()`). After first access, the row is deleted from the database. Not soft-deleted. Deleted.

Passwords are hashed with bcrypt. Gitleaks runs in CI to catch accidentally committed secrets. Auth endpoints are rate-limited.

## CI/CD pipeline

Two GitHub Actions workflows.

The CI workflow runs on every push and pull request: format check (Prettier), TypeScript type checking across all workspaces, the full test suite (583 tests), a production build, Gitleaks secret scanning, and a dependency audit. Bun's dependency cache keeps installs under 5 seconds after the first run.

The deploy workflow triggers on merges to the prod branch. It builds Docker images for the backend and frontend in parallel using a matrix strategy, pushes them to GitHub Container Registry, then SSHs into the VPS to pull the new images, run database migrations, and restart the containers. A health check at the end confirms both services respond. The whole deploy takes about 4 minutes from push to live.

![CI Token Generation](./images/generate-ci-token.jpg)

## Who this is for

I built DepVault for small teams and solo developers who work across multiple stacks. If you're running a Node.js frontend, a Python ML service, and a .NET API, you probably don't want three different tools for dependency health. And if your team is still sharing secrets over Slack, that's a problem DepVault actually solves.

The format converter alone has been useful outside the main workflow. Drop in an `appsettings.json`, get back a `.env` file. Or the other way around. It's the kind of utility I kept wishing existed when switching between projects.

![Config Converter](./images/converter.jpg)

## Try it out

DepVault is live at [depvault.suxrobgm.net](https://depvault.suxrobgm.net). Source code is at [github.com/suxrobGM/depvault](https://github.com/suxrobGM/depvault). Create an account, throw a `package.json` at it, see what turns up.
