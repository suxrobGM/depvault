# DepVault — Product Requirements Document

## 1. Overview

**Project Name:** DepVault
**Description:** A unified developer dashboard to analyze packages, scan for vulnerabilities, and securely store and sync config files and secret files (`.env`, `appsettings.json`, SSL certificates, private keys, keystores, mobile provisioning profiles, and more) across every major language ecosystem. DepVault mirrors your repository: each project maps to a repo, each app/service folder becomes an **App**, and every config or secret file is stored as a single **end-to-end-encrypted blob** restored byte-for-byte on pull.
**Tech Stack:** Next.js 16 (frontend), MUI 9 (UI components), Tailwind CSS v4 (optional utility styling), ElysiaJS (backend API), Prisma (ORM), PostgreSQL (database), TypeScript (end-to-end), GitHub Actions (CI/CD)

---

## 2. Problem Statement

Developers working across multiple projects and tech stacks waste time switching between ecosystem-specific tools to check dependency health, track vulnerabilities, and manage config files. Secrets get shared over Slack, `.env` and `appsettings.json` files drift between environments, sensitive files like SSL certificates and keystores sit unprotected in shared drives, and outdated packages go unnoticed until something breaks. There is no single tool that handles dependency analysis, config-file management, and secure file storage across every major ecosystem — and that treats config the way developers actually keep it: as files living next to the code, organized by repo and app.

---

## 3. Goals

- **Zero-knowledge security** — all config and secret file contents are end-to-end encrypted client-side; the server stores only ciphertext and can never decrypt user data (no plaintext in logs, API responses, browser cache, or database columns)
- Offer encrypted, repo-native storage for config files and secret files with team sharing, per-environment organization, and file-level version diffing
- Provide a single dashboard to analyze dependencies from any major package manager
- Detect outdated packages, known vulnerabilities, and license conflicts automatically
- Support multi-project management with at-a-glance health scores
- Deliver a clean, fast developer experience with minimal setup friction

---

## 4. User Personas

- **Solo Full-Stack Developer** — Works across multiple projects in different stacks. Needs one place to track dependency health and store config files instead of juggling ecosystem-specific tools.
- **Tech Lead at a Startup** — Manages several microservices (multiple apps in one repo) with a small team. Needs visibility into vulnerabilities across services and a secure way to onboard new hires with the right config and secret files.
- **Junior Developer Joining a Team** — New to a codebase with several apps, each with its own `.env` and secret files. Needs to `depvault pull` and have every config file land at its exact path, plus a quick read on the project's dependency landscape.

---

## 5. Tech Stack

| Layer            | Technology                                            | Version |
| ---------------- | ----------------------------------------------------- | ------- |
| Frontend         | Next.js (App Router)                                  | 16      |
| UI Library       | MUI (Material UI)                                     | 7       |
| Utility CSS      | Tailwind CSS (optional)                               | 4       |
| Backend API      | ElysiaJS (Bun runtime)                                | Latest  |
| ORM              | Prisma                                                | Latest  |
| Database         | PostgreSQL                                            | 16+     |
| Language         | TypeScript                                            | 5.x     |
| Auth             | Email/password + GitHub OAuth + JWT                   | —       |
| Encryption       | AES-256-GCM                                           | —       |
| Password Hashing | bcrypt                                                | —       |
| External APIs    | npm, PyPI, crates.io, NuGet, OSV.dev, GitHub Advisory | —       |
| CI/CD            | GitHub Actions                                        | —       |
| Containerization | Docker / Docker Compose                               | —       |

---

## 6. Features

### Authentication & User Management

- Email and password registration and login
- Email verification on signup
- Password reset via email link
- GitHub OAuth login
- Link GitHub account to existing email-based account
- JWT-based session management
- User profile with avatar, username, and email settings

### Project Management

- Create, edit, and delete projects
- Invite team members by email or GitHub username
- Role-based access control per project (owner, editor, viewer)
- Multi-project dashboard with health score summary cards
- Project-level settings and danger zone (transfer ownership, delete)

### Dependency Analyzer

- Upload or paste dependency files from any supported ecosystem
- Parse direct and transitive dependency trees
- Check current vs latest version for each package
- Flag outdated, deprecated, and unmaintained packages
- Cross-reference CVE databases for known vulnerabilities with severity ratings
- Interactive dependency tree graph with search, zoom, and collapse
- Duplicate dependency detection
- Per-dependency health score based on maintenance activity, popularity, and age
- Upgrade suggestion engine (e.g., moment.js → date-fns)

### License Compliance

- Detect license type for each dependency
- Configurable license policy per project (allow, warn, block)
- Flag restrictive licenses (GPL, AGPL) in commercial projects
- License compliance summary with pass/warn/fail counts
- Export license audit report as CSV or PDF

### Repo-Native Config File Manager

- Repo-native hierarchy: **Project** (a repo) → **App** (one app/service root folder, identified by its repo-relative `appPath`) → **ConfigFile** / **SecretFile**
- Each config file is stored as a single **client-encrypted blob** (base64 ciphertext + IV + auth tag) — the server is zero-knowledge and never parses or decrypts it
- Environment is an **open-set string slug** column on each file (`base`, `dev`, `prod`, `staging`, `local`, `test`, or any custom slug like `qa`) — not a tag, not a separate table
- Supported config files: `.env` and its variants, `appsettings.json` / `appsettings.<Env>.json`, and any other plaintext config file pushed from the repo
- File-level versioning: every push or web save snapshots the full encrypted blob; restore-to-version is supported
- Web repo browser shows a **git-style diff** between any two versions, computed client-side after decrypt
- Plaintext config files are editable in the browser via a **Form editor** (key/value table for `.env`) or a **Raw editor** (CodeMirror code editor); both re-encrypt on save
- Byte-faithful sync: `depvault pull` writes each decrypted file verbatim to its original repo-relative path

### Secret File Storage

- Push and securely store secret files per app, at their exact repo-relative path, each as a single client-encrypted blob
- All files are end-to-end encrypted client-side using AES-256-GCM — plaintext never reaches the server, disk, or temp storage
- Supported file types include SSL/TLS certificates, private keys, keystores, mobile provisioning profiles, cloud service account credentials, and other sensitive binary or text files
- Reject executable file types (.exe, .sh, .bat, .cmd, .ps1) and validate filenames against path traversal
- Plaintext secret files are editable in-browser; binary files are download-only
- Download files individually or as a bundled archive (ciphertext stream, decrypted in-memory client-side only)
- File metadata: repo-relative path, description, environment slug, upload date, uploaded by, file size, MIME type, binary flag (metadata is not encrypted, file content is)
- Version history per file with a diff for text-based files and rollback support
- Access restricted to authorized project members based on role — viewers cannot download file contents
- All push, download, and delete events recorded in the audit log

### Secret Sharing

- Generate encrypted one-time-read links for a config file or secret file
- Optional password protection on shared links
- Configurable auto-expiration (1 hour, 24 hours, 7 days, custom)
- Audit log of link creation, access, and expiration

### File Age & Alerts

- Visual age indicators on the dashboard and repo browser (green, yellow, red) based on each file's last update
- Email notifications when a stale config or secret file crosses a configurable age threshold
- Update history derived from each file's version snapshots

### Onboarding

- New team members run `depvault pull` to restore every config and secret file for the project to its exact repo-relative path in one step
- The repo browser surfaces which apps and environments exist so a new hire knows what to expect locally
- Per-app, per-environment scoping keeps onboarding focused on the files a given service actually needs

### Git-Aware Secret Detection

- Connect a GitHub repository to a project for automated secret scanning
- Scan commit history and staged changes for accidentally committed secrets (API keys, tokens, passwords, private keys, connection strings)
- Pattern-based detection using configurable regex rules plus built-in patterns for common providers (AWS, GCP, Stripe, GitHub, etc.)
- Alert project owners immediately when a leaked secret is detected
- Provide remediation guidance: which commit, which file, which line, and steps to rotate the credential
- Dashboard widget showing scan status and detection history per project

### CI/CD Secret Injection

- Generate short-lived, scoped API tokens that CI pipelines use to pull config and secret files at build time
- Tokens are bound to a specific **app + environment slug**, with an optional IP allowlist
- The token carries a client-wrapped copy of the project DEK so the CLI can decrypt locally — the server never holds an unwrapped key
- `depvault ci pull` fetches the app's base and selected-environment config/secret blobs, decrypts them client-side, and writes each file to its exact repo-relative path
- Supported integrations: GitHub Actions, GitLab CI, Azure DevOps (via CLI pull)
- No plaintext config files stored in CI — blobs are fetched on demand and decrypted in-memory in the runner
- Token usage logged in the audit trail with pipeline run ID and timestamp
- Revoke tokens instantly from the dashboard; revoked tokens fail immediately on next use

### Repo Export

- Export the client-encrypted config and secret blobs for a single file, a whole environment, a single app, or the entire repo
- Content is returned as ciphertext and decrypted client-side — useful for backups and for moving a whole app's config between machines
- Pairs with byte-faithful pull so a freshly cloned repo can be re-hydrated with all of its config and secret files in one step

### Secret File Bundler

- One-click download of selected config and secret files for a specific app + environment as a single encrypted archive (.zip)
- User selects which files to include before bundling
- Archive is encrypted with a one-time password displayed to the user (never stored server-side after generation)
- Bundle can be shared via a one-time link (reuses secret sharing infrastructure)
- Useful for onboarding: a new team member downloads a single bundle instead of collecting files one by one

### Notifications

- Email alerts for newly discovered vulnerabilities
- Stale config / secret file reminders
- Team invite and role change notifications
- Git secret detection alerts when leaked credentials are found in connected repositories
- CI/CD token expiration and revocation notifications

### Supported Formats

**Dependency files:**

| Ecosystem   | Files                                              |
| ----------- | -------------------------------------------------- |
| Node.js     | package.json                                       |
| Python      | requirements.txt, pyproject.toml, Pipfile          |
| Rust        | Cargo.toml, Cargo.lock                             |
| .NET        | .csproj, packages.config, Directory.Packages.props |
| Go          | go.mod                                             |
| Java/Kotlin | pom.xml, build.gradle, libs.versions.toml          |
| Ruby        | Gemfile                                            |
| PHP         | composer.json                                      |

**Environment/config files:**

| Format      | Files                                               |
| ----------- | --------------------------------------------------- |
| Dotenv      | .env, .env.local, .env.production, .env.development |
| .NET        | appsettings.json, appsettings.Production.json       |
| Kubernetes  | secrets.yaml, values.yaml                           |
| Spring Boot | application.properties, application.yml             |
| Generic     | config.toml, config.yaml                            |

**Secret files:**

| Category               | Files / Extensions                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------- |
| SSL/TLS Certificates   | .pem, .crt, .cer, .der, .p12, .pfx                                                     |
| Private Keys           | .key, .pem (private), .ppk                                                             |
| Java/Android Keystores | .jks, .keystore, .bks                                                                  |
| iOS/macOS Provisioning | .mobileprovision, .provisionprofile                                                    |
| Cloud Credentials      | google-services.json, GoogleService-Info.plist, service-account.json, credentials.json |
| SSH Keys               | id_rsa, id_ed25519, known_hosts, authorized_keys                                       |
| GPG/PGP Keys           | .gpg, .asc, .pgp                                                                       |
| Generic Secrets        | Any binary or text file explicitly uploaded by the user                                |

---

## 7. Non-Functional Requirements

- **Security (highest priority):**
  - **End-to-end encryption:** All config and secret file contents are encrypted **client-side** with AES-256-GCM before they reach the server, which stores and returns only ciphertext. One data encryption key (DEK) per project, wrapped per user: the vault password derives a KEK via PBKDF2-SHA256 (600k iterations) that wraps the DEK (SELF grant); ECDH P-256 grants wrap the DEK for team members; a recovery key wraps it for account recovery. The vault password and KEK never leave the client. The server is zero-knowledge — there is no master key and no server-side decryption.
  - **Encryption in transit:** HTTPS/TLS enforced on all connections. API responses containing file content use `Cache-Control: no-store` and `Pragma: no-cache` headers. Strict Transport Security (HSTS) enabled.
  - **Zero plaintext guarantee:** Decrypted config or file content must never appear in plaintext in database columns, application logs, error messages, stack traces, API error responses, or browser local/session storage. Log sanitization middleware strips any value matching known secret patterns.
  - **Password security:** Passwords hashed with bcrypt (minimum cost factor 12). No plaintext password storage or transmission after initial TLS-encrypted request.
  - **Authentication hardening:** JWT access tokens expire in 15 minutes, refresh tokens in 7 days. Refresh token rotation on every use (old token invalidated). Rate-limit auth endpoints: 5 attempts per minute per IP for login, 3 per hour for password reset.
  - **Authorization enforcement:** Every API endpoint behind auth guard except public auth routes. Role-based access checked at the service layer, not just the controller. Viewers cannot download config or secret file content — only owners and editors can read/write file blobs.
  - **File upload security:** Validate file size (max 25 MB for secret files), reject executable file types (.exe, .sh, .bat, .cmd, .ps1), scan repo-relative paths for traversal patterns. Files are stored as client-encrypted blobs and never written to disk in plaintext on the server.
  - **Secret sharing security:** One-time links use 256-bit cryptographically random tokens. Encrypted payload stored server-side, deleted immediately after first access. Links expire at the configured deadline even if unread. Brute-force protection: rate-limit link access attempts.
  - **Input validation:** All user input validated and sanitized on both client and server. Parameterized queries via Prisma prevent SQL injection. Output encoding prevents XSS. File content parsed in a sandboxed context.
  - **Audit trail:** All secret access, modification, deletion, sharing, and download events logged with timestamp, user ID, IP address, and action type. Audit logs are append-only and cannot be modified by users.
  - **Frontend security:** Decrypted file content is never stored in React state longer than the active view session. Sensitive content is masked by default in the UI, revealed only on explicit user action. Clipboard operations for secrets use the Clipboard API and clear after 30 seconds. One-time share-link keys live only in the URL fragment and never reach the server.
  - **Dependency security:** Lockfile pinned dependencies. Regular `bun audit` in CI. No secrets in source code — enforced via pre-commit hooks and CI secret scanning.
- **Performance:** Dashboard loads in under 2 seconds. Dependency analysis completes within 10 seconds for files with up to 500 packages.
- **Scalability:** Support up to 50 projects per user, with plan-based limits on config files (`maxConfigFiles`) and secret files (`maxSecretFiles`) per project — e.g. 100 config files and 10 secret files on FREE, 1000 / 100 on PRO, unlimited on TEAM (secret files up to 25 MB each).
- **Accessibility:** WCAG 2.1 AA compliance via MUI 9's built-in accessibility features.
- **Browser Support:** Latest versions of Chrome, Firefox, Safari, and Edge.

---

## 8. User Stories & Acceptance Criteria

### US-00: Zero-Knowledge Security Baseline

**As a** platform operator, **I want to** guarantee that no config or secret file content is ever exposed in plaintext on the server **so that** users can trust DepVault with their most sensitive credentials.

**Acceptance Criteria:**

- Config and secret file contents are encrypted **client-side** before upload; the server stores and returns only ciphertext (base64 blob + IV + auth tag) and can never decrypt them
- The project DEK is wrapped per user (SELF / ECDH / RECOVERY grants); the vault password and KEK never leave the client
- No plaintext file content appears in application logs, error responses, or stack traces — verified by log sanitization middleware and automated grep-based CI checks
- API responses for file content include `Cache-Control: no-store` headers
- Decrypted content is never written to disk on the server (temp files, swap, crash dumps)
- The web repo browser decrypts blobs in-memory only for the active view; reveal requires explicit user action
- One-time share links are destroyed server-side after first read — no second access possible even with the same token
- File pushes reject executable types and validate against path traversal
- JWT refresh tokens are rotated on every use; old tokens cannot be replayed
- All file access events (read, update, delete, download, share) are recorded in an append-only audit log with resource type `CONFIG_FILE` or `SECRET_FILE`
- CI pipeline includes secret scanning (no hardcoded secrets in source) and dependency auditing

### US-01: Register and Login with Email

**As a** developer, **I want to** create an account with email and password **so that** I can use DepVault without a GitHub account.

**Acceptance Criteria:**

- User can register with email, username, and password
- Password must meet minimum strength requirements (8+ chars, one uppercase, one number)
- Email verification is sent upon registration
- User can log in with email and password after verification
- Password reset flow works via email link
- Invalid credentials show a clear error without revealing which field is wrong

### US-02: Login with GitHub OAuth

**As a** developer, **I want to** log in with my GitHub account **so that** I can get started quickly without creating a new password.

**Acceptance Criteria:**

- User can initiate login via GitHub OAuth button
- First-time GitHub login creates an account and pulls avatar, username, and email
- Returning GitHub users are logged in directly
- GitHub account can be linked to an existing email-based account

### US-03: Upload and Analyze a Dependency File

**As a** developer, **I want to** upload a dependency file from any supported ecosystem **so that** I can see which packages are outdated or vulnerable.

**Acceptance Criteria:**

- User can upload or paste content from any supported dependency file format
- System correctly parses and lists all direct dependencies with name and current version
- Each dependency shows current version, latest version, and update status (up-to-date, minor, major, deprecated)
- Known vulnerabilities are flagged with severity level and CVE ID
- Analysis completes within 10 seconds for files with up to 500 packages
- Unsupported formats display a clear error message

### US-04: View Dependency Tree Visualization

**As a** developer, **I want to** see an interactive dependency tree **so that** I can understand the full dependency chain and spot risky transitive dependencies.

**Acceptance Criteria:**

- Dependency tree renders as an interactive graph with expandable/collapsible nodes
- Nodes are color-coded by vulnerability status
- User can search for a specific package within the tree
- Clicking a node shows a detail panel with metadata, license, and changelog link
- Tree handles up to 500 direct dependencies without significant lag

### US-05: Diff a Config File Across Versions

**As a** tech lead, **I want to** see a git-style diff between two versions of a config file **so that** I can review exactly what changed before deploying.

**Acceptance Criteria:**

- User can open a config file in the repo browser and pick any two versions from its history
- A git-style line diff is shown, computed **client-side** after the two blobs are decrypted
- The same diff view works for any plaintext config file (e.g. `.env`, `appsettings.json`), regardless of format
- Additions, deletions, and changed lines are visually distinguished
- The diff never sends decrypted content to the server

### US-06: Store and Retrieve Config Files and Secret Files

**As a** developer, **I want to** securely store my repo's config files and secret files, organized by app and environment **so that** I don't rely on scattered local `.env` files and shared drives for sensitive credentials.

**Acceptance Criteria:**

- Files are organized as Project (repo) → App (service folder) → ConfigFile / SecretFile; an app is identified by its repo-relative `appPath`
- User can push, edit, and delete config files (`.env`, `appsettings.json`, etc.) and secret files (SSL certs, private keys, keystores, provisioning profiles, cloud credentials, etc.) per app
- Each file carries an open-set environment slug (`base`, `dev`, `prod`, `staging`, `local`, `test`, or any custom slug)
- Every file is stored as a single end-to-end-encrypted blob; all encryption/decryption happens client-side
- `depvault push` uploads the whole file verbatim — no parsing into variables and no stale-variable pruning
- Plaintext config files can be edited in-browser via a Form (key/value) or Raw (code) editor; both re-encrypt on save
- Each config and secret file maintains full version history with restore/rollback support
- Files are accessible only by authorized project members; viewers cannot download file content

### US-07: Share Secrets via One-Time Links

**As a** team member, **I want to** share a config or secret file via an encrypted one-time link **so that** credentials don't sit in Slack or email history.

**Acceptance Criteria:**

- User can generate a shareable link for a config file or a secret file
- The decryption key travels in the URL fragment and never reaches the server
- Link is single-use and content is destroyed after first access
- Optional password protection can be added
- Link auto-expires after a user-defined duration
- Creator can see link status (pending, viewed, expired) in an audit log

### US-08: Multi-Project Dashboard

**As a** developer managing multiple projects, **I want to** see health scores across all my projects **so that** I know which needs attention first.

**Acceptance Criteria:**

- Dashboard shows all projects in a card or table layout
- Each project shows a health score based on dependency freshness, vulnerability count, config-file coverage, stale-file age, and git secret scan status
- Projects can be sorted and filtered by health score, last updated, or name
- Clicking a project navigates to its detail page

### US-09: One-Command Onboarding for New Team Members

**As a** new hire, **I want to** restore all of a project's config and secret files to my working copy in one command **so that** I can set up my local environment quickly.

**Acceptance Criteria:**

- New members run `depvault pull` and every config and secret file is written byte-for-byte to its original repo-relative path, recreating directories as needed
- The repo browser shows which apps and environments exist so the new hire knows what was restored
- Pull can be scoped with `--app` and `--environment` (with `--include-base`) when only one service's files are needed
- Files that already exist are overwritten only after confirmation (or with `--force`)

### US-10: Convert Between Config Formats

**As a** developer, **I want to** convert my .env file to appsettings.json or vice versa **so that** I can switch formats without manual rewriting.

**Acceptance Criteria:**

- User can select source and target format from all supported types
- Conversion preserves all key-value pairs and handles nested structures
- Preview is shown before download
- Edge cases (comments, multiline values, special characters) are handled or flagged

### US-11: Detect Secrets Leaked in Git Repositories

**As a** tech lead, **I want to** scan my connected GitHub repository for accidentally committed secrets **so that** I can rotate compromised credentials before they are exploited.

**Acceptance Criteria:**

- User can connect a GitHub repository to a DepVault project via OAuth
- System scans commit history for secrets matching built-in and custom regex patterns
- Detected leaks are displayed with commit hash, file path, line number, and matched pattern
- Project owners receive an immediate notification (in-app + email) when a leak is found
- Remediation guidance is shown for each detection (rotate credential, remove from history)
- Scan results are visible on the project dashboard with a detection history timeline

### US-12: Inject Secrets into CI/CD Pipelines

**As a** DevOps engineer, **I want to** restore my config and secret files in my CI pipeline at build time using a short-lived token **so that** I don't commit `.env` files or hardcode credentials in CI configuration.

**Acceptance Criteria:**

- User can generate a scoped CI token from the project settings, bound to a specific **app and environment slug**
- The token carries a client-wrapped copy of the project DEK so the CLI can decrypt locally; the server never holds an unwrapped key
- Token can optionally be restricted to an IP allowlist
- `depvault ci pull` fetches the app's base and selected-environment config and secret blobs via `GET /api/ci/secrets`, decrypts them client-side, and writes each file to its exact repo-relative path
- Tokens expire after a configurable duration (1 hour up to 1 year)
- Token usage is logged in the audit trail with pipeline run ID
- Tokens can be revoked instantly from the dashboard; revoked tokens return 401 on next use
- Example integration snippets provided for GitHub Actions and GitLab CI

### US-13: Bootstrap a New Environment from an Existing One

**As a** developer, **I want to** copy an app's config files from one environment slug to a new one **so that** I don't have to recreate a service's config from scratch when spinning up a new stage.

**Acceptance Criteria:**

- User can select an app's config files for a source environment slug (e.g. `staging`) and save copies under a new slug (e.g. `prod`)
- Copied files start as a duplicate blob the user can then edit in the Form or Raw editor and re-encrypt
- Secret files are listed by path and description for reference but must be re-pushed for the new environment
- The repo browser's environment selector exposes the new slug as soon as the first file for it exists
- The version diff view shows how the new environment's config has diverged from the source over time

### US-14: Download a Config + Secret File Bundle for an Environment

**As a** new team member, **I want to** download all of an app's config and secret files for my environment in a single archive **so that** I can set up my local environment in one step.

**Acceptance Criteria:**

- User can select an app + environment and generate a bundled .zip download
- User can choose which config and secret files to include before generating the bundle
- Archive is encrypted with a one-time password shown to the user at generation time
- Bundle can alternatively be shared as a one-time link with auto-expiration
- Download event is recorded in the audit log

---

## 9. Sprint Plan

### Sprint 1 — Foundation & Core Analysis (2 weeks)

**Goal:** Users can register, log in, create projects, and analyze Node.js and Python dependency files.

| Task                        | Details                                                                                                                                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Project setup               | Initialize Next.js 16, ElysiaJS, Prisma, PostgreSQL, Docker Compose                                                                                                                                                                  |
| CI pipeline                 | GitHub Actions workflow for lint, type-check, test, build, secret scanning, and dependency audit on every PR                                                                                                                         |
| Encryption foundation       | Client-side E2E key hierarchy (vault password → PBKDF2 KEK → wrapped per-project DEK), AES-256-GCM encrypt/decrypt in browser + CLI, zero-knowledge server, log sanitization middleware, `Cache-Control: no-store` on file endpoints |
| Auth — email/password       | Registration, login, email verification, password reset, JWT issuance with 15-min access / 7-day refresh tokens, refresh token rotation                                                                                              |
| Auth — GitHub OAuth         | OAuth flow, account creation, account linking                                                                                                                                                                                        |
| Database schema             | Users, projects, members, analyses, dependencies tables via Prisma migrate                                                                                                                                                           |
| Project CRUD                | Create, edit, delete projects with basic settings                                                                                                                                                                                    |
| Rate limiting               | Rate-limit auth endpoints (5 login/min/IP, 3 reset/hr), rate-limit secret access and share link attempts                                                                                                                             |
| Team invites                | Invite members by email, role assignment (owner/editor/viewer)                                                                                                                                                                       |
| Dependency parser — Node.js | Parse package.json and package-lock.json, resolve versions                                                                                                                                                                           |
| Dependency parser — Python  | Parse requirements.txt and pyproject.toml, resolve versions                                                                                                                                                                          |
| Version checker             | Query npm and PyPI registries for latest versions                                                                                                                                                                                    |
| Vulnerability scanner       | Cross-reference parsed packages against OSV.dev and GitHub Advisory                                                                                                                                                                  |
| Analysis results UI         | Table view with version status, vulnerability badges, and severity indicators                                                                                                                                                        |
| Dashboard — basic           | Project list with names, last analyzed date, and placeholder health scores                                                                                                                                                           |

### Sprint 2 — Repo-Native Storage, Secret Sharing & Polish (2 weeks)

**Goal:** Users can store end-to-end-encrypted config and secret files organized by app and environment, browse and edit them in the web repo browser, diff versions, push/pull byte-faithfully from the CLI, inject config into CI/CD, detect leaked secrets in git, and view dependency trees. Expand ecosystem support.

| Task                               | Details                                                                                                                                                                      |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App + config-file storage          | App model (`projectId` + `appPath`), config files stored as client-encrypted blobs with an open-set environment slug, push/save/restore with full version history            |
| Secret file storage                | Push, download, delete, and version secret files (certs, keys, keystores, provisioning profiles, cloud credentials) per app as client-encrypted blobs                        |
| Repo browser + file editor         | Left pane of apps grouped by path, environment selector, Form (key/value) + Raw (CodeMirror) editors for plaintext config, download-only for binary files                    |
| Version diff                       | Client-side git-style diff between any two versions of a config or secret file after decrypt                                                                                 |
| CLI push/pull                      | Byte-faithful push (whole-file blob, app + env inferred from path/filename) and pull (restore each file verbatim to its original repo-relative path)                         |
| Format converter                   | Convert between all supported config formats with preview (standalone utility)                                                                                               |
| Secret sharing                     | One-time encrypted links for a config or secret file with password protection and auto-expiration; key in URL fragment                                                       |
| Audit log                          | Track file read/update/delete/download/share events with resource type `CONFIG_FILE` / `SECRET_FILE`                                                                         |
| File age alerts                    | Stale-file age indicators and email reminders                                                                                                                                |
| Dependency tree visualization      | Interactive graph with search, zoom, and color-coded nodes                                                                                                                   |
| License detection                  | Detect license per dependency, configurable policy, compliance summary                                                                                                       |
| Dependency parser — Rust, .NET, Go | Parse Cargo.toml, .csproj, go.mod                                                                                                                                            |
| Git secret detection               | GitHub repo connection via OAuth, commit history scanning with built-in + custom regex patterns, leak alerts and remediation guidance                                        |
| CI/CD secret injection             | CI tokens scoped to app + environment with a client-wrapped DEK, `GET /api/ci/secrets` blob fetch, `depvault ci pull` byte-faithful restore, token revocation, audit logging |
| Repo export                        | Export client-encrypted config + secret blobs for a file, environment, app, or whole repo for backup and re-hydration                                                        |
| Secret file bundler                | One-click encrypted .zip download of selected config + secret files per app/environment, one-time password encryption, shareable via one-time link                           |
| Health score engine                | Composite score from dependency freshness + vulnerability count + config-file coverage + stale-file age                                                                      |
| Dashboard — final                  | Sortable/filterable project cards with health scores, git scan status, alerts, and last updated                                                                              |
| Notifications                      | Email alerts for new vulnerabilities, stale-file reminders, git leak detection alerts, CI token expiration notices                                                           |
| Security audit                     | Automated CI checks for plaintext secret leakage in logs/responses, pre-commit hooks for secret scanning, verify zero-leakage guarantees end-to-end                          |
| CD pipeline                        | GitHub Actions deploy workflow to production environment                                                                                                                     |
