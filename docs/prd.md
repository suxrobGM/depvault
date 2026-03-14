# DepVault — Product Requirements Document

## 1. Overview

**Project Name:** DepVault
**Description:** A unified developer dashboard to analyze packages, scan for vulnerabilities, and securely store and sync environment variables and secret files (SSL certificates, private keys, keystores, mobile provisioning profiles, and more) across every major language ecosystem and config format.
**Tech Stack:** Next.js 16 (frontend), MUI 7 (UI components), Tailwind CSS v4 (optional utility styling), ElysiaJS (backend API), Prisma (ORM), PostgreSQL (database), TypeScript (end-to-end), GitHub Actions (CI/CD)

---

## 2. Problem Statement

Developers working across multiple projects and tech stacks waste time switching between ecosystem-specific tools to check dependency health, track vulnerabilities, and manage environment variables. Secrets get shared over Slack, .env files drift between environments, sensitive files like SSL certificates and keystores sit unprotected in shared drives, and outdated packages go unnoticed until something breaks. There is no single tool that handles dependency analysis, environment variable management, and secure file storage across every major ecosystem.

---

## 3. Goals

- **Zero-leakage security** — ensure no secret value or file content is ever exposed in plaintext outside the vault (no logs, no API responses to unauthorized users, no browser cache, no database columns)
- Offer encrypted storage for environment variables and secret files with team sharing and environment diffing
- Provide a single dashboard to analyze dependencies from any major package manager
- Detect outdated packages, known vulnerabilities, and license conflicts automatically
- Support multi-project management with at-a-glance health scores
- Deliver a clean, fast developer experience with minimal setup friction

---

## 4. User Personas

- **Solo Full-Stack Developer** — Works across multiple projects in different stacks. Needs one place to track dependency health and store env variables instead of juggling ecosystem-specific tools.
- **Tech Lead at a Startup** — Manages several microservices with a small team. Needs visibility into vulnerabilities across services and a secure way to onboard new hires with the right secrets.
- **Junior Developer Joining a Team** — New to a codebase with dozens of env vars. Needs a clear setup checklist and a quick read on the project's dependency landscape.

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

### Environment Variable Manager

- Create, read, update, and delete env variables per project per environment
- Encrypted vault storage (AES-256-GCM, encrypted at rest)
- Bulk import from any supported config format
- Bulk export to any supported config format
- Side-by-side environment diff (dev vs staging vs production)
- Missing variable detection across environments
- Variable descriptions, validation rules, and required flags
- Generate .env.example templates from stored variables
- Format conversion between supported config types

### Secret File Storage

- Upload and securely store binary secret files per project per environment
- All files encrypted at rest using AES-256-GCM — plaintext never written to disk or temp storage
- Supported file types include SSL/TLS certificates, private keys, keystores, mobile provisioning profiles, cloud service account credentials, and other sensitive binary or text files
- Reject executable file types (.exe, .sh, .bat, .cmd, .ps1) and validate filenames against path traversal
- Download files individually or as a bundled archive (encrypted stream, decrypted in-memory only)
- File metadata: name, description, environment, upload date, uploaded by, file size (metadata is not encrypted, file content is)
- Version history per file with diff for text-based files and rollback support
- Access restricted to authorized project members based on role — viewers cannot download file contents
- All upload, download, and delete events recorded in the audit log

### Secret Sharing

- Generate encrypted one-time-read links for env variables or secret files
- Optional password protection on shared links
- Configurable auto-expiration (1 hour, 24 hours, 7 days, custom)
- Audit log of link creation, access, and expiration

### Secret Rotation & Alerts

- Configurable rotation policy per variable (30, 60, 90 days, custom)
- Visual age indicators on dashboard (green, yellow, red)
- Email notifications when secrets exceed rotation threshold
- Rotation history log with timestamps

### Onboarding Checklist

- Project owners mark variables as required for local setup
- New team members see a setup checklist with variable names, descriptions, and expected format
- Per-user completion tracking
- One-click .env.example download with placeholders

### Git-Aware Secret Detection

- Connect a GitHub repository to a project for automated secret scanning
- Scan commit history and staged changes for accidentally committed secrets (API keys, tokens, passwords, private keys, connection strings)
- Pattern-based detection using configurable regex rules plus built-in patterns for common providers (AWS, GCP, Stripe, GitHub, etc.)
- Alert project owners immediately when a leaked secret is detected
- Provide remediation guidance: which commit, which file, which line, and steps to rotate the credential
- Dashboard widget showing scan status and detection history per project

### CI/CD Secret Injection

- Generate short-lived, scoped API tokens that CI pipelines use to pull secrets at build time
- Tokens are bound to a specific project, environment, and optional IP allowlist
- Supported integrations: GitHub Actions, GitLab CI, Azure DevOps (via environment variable injection or CLI pull)
- No .env files stored in CI — secrets are fetched on demand and never persisted to disk in the runner
- Token usage logged in the audit trail with pipeline run ID and timestamp
- Revoke tokens instantly from the dashboard; revoked tokens fail immediately on next use

### Environment Templates

- Clone an entire environment's variable structure and secret file list to bootstrap a new environment (e.g., clone staging → production)
- Template preserves variable names, descriptions, validation rules, and required flags — values are left blank for the target environment
- Secret files in the template are listed by name and description but not copied (must be re-uploaded for the new environment)
- Save reusable templates per project that can be applied to any new environment
- Diff a template against an existing environment to detect missing or extra variables

### Secret File Bundler

- One-click download of all required env variables and secret files for a specific project + environment as a single encrypted archive (.zip)
- User selects which variables and files to include before bundling
- Archive is encrypted with a one-time password displayed to the user (never stored server-side after generation)
- Bundle can be shared via a one-time link (reuses secret sharing infrastructure)
- Useful for onboarding: new team member downloads a single bundle instead of collecting files one by one

### Notifications

- Email alerts for newly discovered vulnerabilities
- Secret rotation reminders
- Environment drift warnings when variables are missing across environments
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
  - **Encryption at rest:** All env variable values and secret file contents encrypted with AES-256-GCM using per-project keys. Encryption keys managed via a dedicated key hierarchy (master key → project key → data encryption key). Master key sourced from environment, never stored in the database.
  - **Encryption in transit:** HTTPS/TLS enforced on all connections. API responses containing secret data use `Cache-Control: no-store` and `Pragma: no-cache` headers. Strict Transport Security (HSTS) enabled.
  - **Zero plaintext guarantee:** Secret values and file contents must never appear in plaintext in database columns, application logs, error messages, stack traces, API error responses, or browser local/session storage. Log sanitization middleware strips any value matching known secret patterns.
  - **Password security:** Passwords hashed with bcrypt (minimum cost factor 12). No plaintext password storage or transmission after initial TLS-encrypted request.
  - **Authentication hardening:** JWT access tokens expire in 15 minutes, refresh tokens in 7 days. Refresh token rotation on every use (old token invalidated). Rate-limit auth endpoints: 5 attempts per minute per IP for login, 3 per hour for password reset.
  - **Authorization enforcement:** Every API endpoint behind auth guard except public auth routes. Role-based access checked at the service layer, not just the controller. Viewers cannot decrypt secret values — only owners and editors can read/write secrets.
  - **File upload security:** Validate file size (max 25 MB), reject executable MIME types (.exe, .sh, .bat, .cmd, .ps1), scan filenames for path traversal patterns. Files stored as encrypted blobs, never written to disk in plaintext.
  - **Secret sharing security:** One-time links use 256-bit cryptographically random tokens. Encrypted payload stored server-side, deleted immediately after first access. Links expire at the configured deadline even if unread. Brute-force protection: rate-limit link access attempts.
  - **Input validation:** All user input validated and sanitized on both client and server. Parameterized queries via Prisma prevent SQL injection. Output encoding prevents XSS. File content parsed in a sandboxed context.
  - **Audit trail:** All secret access, modification, deletion, sharing, and download events logged with timestamp, user ID, IP address, and action type. Audit logs are append-only and cannot be modified by users.
  - **Frontend security:** Decrypted secret values never stored in React state longer than the active view session. Values masked by default in the UI, revealed only on explicit user action. Clipboard operations for secrets use the Clipboard API and clear after 30 seconds. No secret values in URL parameters or browser history.
  - **Dependency security:** Lockfile pinned dependencies. Regular `bun audit` in CI. No secrets in source code — enforced via pre-commit hooks and CI secret scanning.
- **Performance:** Dashboard loads in under 2 seconds. Dependency analysis completes within 10 seconds for files with up to 500 packages.
- **Scalability:** Support up to 50 projects per user, 500 env variables per project, and 100 secret files per project (up to 25 MB each).
- **Accessibility:** WCAG 2.1 AA compliance via MUI 7's built-in accessibility features.
- **Browser Support:** Latest versions of Chrome, Firefox, Safari, and Edge.

---

## 8. User Stories & Acceptance Criteria

### US-00: Zero-Leakage Security Baseline

**As a** platform operator, **I want to** guarantee that no secret value or file content is ever exposed in plaintext outside the encrypted vault **so that** users can trust DepVault with their most sensitive credentials.

**Acceptance Criteria:**

- Env variable values and secret file contents are encrypted before database write and decrypted only in-memory for authorized responses
- No secret value appears in application logs, error responses, or stack traces — verified by log sanitization middleware and automated grep-based CI checks
- API responses for secret data include `Cache-Control: no-store` headers
- Decrypted values are never written to disk (temp files, swap, crash dumps)
- Frontend masks all secret values by default; reveal requires explicit click and re-fetches from API
- Clipboard auto-clears after 30 seconds when a user copies a secret
- One-time share links are destroyed server-side after first read — no second access possible even with the same token
- File uploads reject executable types and validate against path traversal
- JWT refresh tokens are rotated on every use; old tokens cannot be replayed
- All secret access events (read, update, delete, download, share) are recorded in an append-only audit log
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

### US-05: Compare Environment Variables Across Environments

**As a** tech lead, **I want to** compare env files across dev, staging, and production side-by-side **so that** I can catch mismatches before deployment.

**Acceptance Criteria:**

- User can select 2 or 3 environments for side-by-side comparison
- Missing variables are highlighted per environment
- Differing values are flagged visually
- Sensitive values are masked by default with a toggle to reveal
- Diff can be exported as markdown or CSV

### US-06: Store and Retrieve Environment Variables and Secret Files

**As a** developer, **I want to** securely store my project's environment variables and secret files in an encrypted vault **so that** I don't rely on scattered local .env files and shared drives for sensitive credentials.

**Acceptance Criteria:**

- User can CRUD env variables per project per environment
- User can upload, download, and delete secret files (SSL certs, private keys, keystores, provisioning profiles, cloud credentials, etc.) per project per environment
- All values and files are encrypted at rest using AES-256-GCM
- Bulk import from any supported config format works correctly
- Bulk export to any supported config format works correctly
- Each variable supports an optional description and validation rule
- Each secret file supports a name, description, and environment tag
- Secret files maintain version history with rollback support
- Vault is accessible only by authorized project members

### US-07: Share Secrets via One-Time Links

**As a** team member, **I want to** share a secret via an encrypted one-time link **so that** credentials don't sit in Slack or email history.

**Acceptance Criteria:**

- User can generate a shareable link for one or more secrets or secret files
- Link is single-use and content is destroyed after first access
- Optional password protection can be added
- Link auto-expires after a user-defined duration
- Creator can see link status (pending, viewed, expired) in an audit log

### US-08: Multi-Project Dashboard

**As a** developer managing multiple projects, **I want to** see health scores across all my projects **so that** I know which needs attention first.

**Acceptance Criteria:**

- Dashboard shows all projects in a card or table layout
- Each project shows a health score based on dependency freshness, vulnerability count, env hygiene, secret rotation age, and git secret scan status
- Projects can be sorted and filtered by health score, last updated, or name
- Clicking a project navigates to its detail page

### US-09: Onboarding Checklist for New Team Members

**As a** new hire, **I want to** see a checklist of required env variables with descriptions **so that** I can set up my local environment quickly.

**Acceptance Criteria:**

- Project owners can mark variables as required for local setup
- New members see a checklist with variable names, descriptions, and expected format
- Checklist tracks completion status per user
- One-click .env.example download with placeholder values

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

**As a** DevOps engineer, **I want to** pull secrets into my CI pipeline at build time using a short-lived token **so that** I don't store .env files or hardcode credentials in CI configuration.

**Acceptance Criteria:**

- User can generate a scoped CI token from the project settings, bound to a specific environment
- Token can optionally be restricted to an IP allowlist
- CI pipeline fetches secrets via a single API call using the token — response includes env variables and download URLs for secret files
- Tokens expire after a configurable duration (1 hour, 24 hours, 7 days)
- Token usage is logged in the audit trail with pipeline run ID
- Tokens can be revoked instantly from the dashboard; revoked tokens return 401 on next use
- Example integration snippets provided for GitHub Actions and GitLab CI

### US-13: Clone Environment via Templates

**As a** developer, **I want to** clone an environment's variable structure to a new environment **so that** I don't have to manually recreate dozens of variables when spinning up a new stage.

**Acceptance Criteria:**

- User can select a source environment and create a new environment with the same variable names, descriptions, and validation rules
- Values are left blank in the new environment — user fills them in manually or via bulk import
- Secret file names and descriptions are listed in the new environment but files must be re-uploaded
- Reusable templates can be saved per project and applied to any new environment
- Diff view shows which variables in an existing environment are missing compared to a template

### US-14: Download Secret File Bundle for an Environment

**As a** new team member, **I want to** download all required secret files and env variables for my environment in a single archive **so that** I can set up my local environment in one step.

**Acceptance Criteria:**

- User can select a project + environment and generate a bundled .zip download
- User can choose which variables and secret files to include before generating the bundle
- Archive is encrypted with a one-time password shown to the user at generation time
- Bundle can alternatively be shared as a one-time link with auto-expiration
- Download event is recorded in the audit log

---

## 9. Sprint Plan

### Sprint 1 — Foundation & Core Analysis (2 weeks)

**Goal:** Users can register, log in, create projects, and analyze Node.js and Python dependency files.

| Task                        | Details                                                                                                                                                         |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project setup               | Initialize Next.js 16, ElysiaJS, Prisma, PostgreSQL, Docker Compose                                                                                             |
| CI pipeline                 | GitHub Actions workflow for lint, type-check, test, build, secret scanning, and dependency audit on every PR                                                    |
| Encryption foundation       | Key hierarchy (master key → project key → DEK), AES-256-GCM encrypt/decrypt service, log sanitization middleware, `Cache-Control: no-store` on secret endpoints |
| Auth — email/password       | Registration, login, email verification, password reset, JWT issuance with 15-min access / 7-day refresh tokens, refresh token rotation                         |
| Auth — GitHub OAuth         | OAuth flow, account creation, account linking                                                                                                                   |
| Database schema             | Users, projects, members, analyses, dependencies tables via Prisma migrate                                                                                      |
| Project CRUD                | Create, edit, delete projects with basic settings                                                                                                               |
| Rate limiting               | Rate-limit auth endpoints (5 login/min/IP, 3 reset/hr), rate-limit secret access and share link attempts                                                        |
| Team invites                | Invite members by email, role assignment (owner/editor/viewer)                                                                                                  |
| Dependency parser — Node.js | Parse package.json and package-lock.json, resolve versions                                                                                                      |
| Dependency parser — Python  | Parse requirements.txt and pyproject.toml, resolve versions                                                                                                     |
| Version checker             | Query npm and PyPI registries for latest versions                                                                                                               |
| Vulnerability scanner       | Cross-reference parsed packages against OSV.dev and GitHub Advisory                                                                                             |
| Analysis results UI         | Table view with version status, vulnerability badges, and severity indicators                                                                                   |
| Dashboard — basic           | Project list with names, last analyzed date, and placeholder health scores                                                                                      |

### Sprint 2 — Env Vault, Secret Sharing & Polish (2 weeks)

**Goal:** Users can store encrypted env variables and secret files, compare environments, share secrets, inject secrets into CI/CD, detect leaked secrets in git, and view dependency trees. Expand ecosystem support.

| Task                               | Details                                                                                                                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Env variable CRUD                  | Create, read, update, delete variables per environment with AES-256-GCM encryption                                                                                                    |
| Secret file storage                | Upload, download, delete, and version secret files (certs, keys, keystores, provisioning profiles, cloud credentials) per environment with AES-256-GCM encryption                     |
| Bulk import/export                 | Import from .env, appsettings.json, secrets.yaml; export to any supported format                                                                                                      |
| Environment diff                   | Side-by-side comparison view with missing/mismatched variable highlighting                                                                                                            |
| Format converter                   | Convert between all supported config formats with preview                                                                                                                             |
| Secret sharing                     | One-time encrypted links for env variables and secret files with password protection and auto-expiration                                                                              |
| Audit log                          | Track link creation, access, and expiration events                                                                                                                                    |
| Secret rotation                    | Rotation policy config, age indicators, email reminders                                                                                                                               |
| Dependency tree visualization      | Interactive graph with search, zoom, and color-coded nodes                                                                                                                            |
| License detection                  | Detect license per dependency, configurable policy, compliance summary                                                                                                                |
| Onboarding checklist               | Required variable and secret file flags, per-user completion tracking, .env.example export                                                                                            |
| Dependency parser — Rust, .NET, Go | Parse Cargo.toml, .csproj, go.mod                                                                                                                                                     |
| Git secret detection               | GitHub repo connection via OAuth, commit history scanning with built-in + custom regex patterns, leak alerts and remediation guidance                                                 |
| CI/CD secret injection             | Scoped short-lived API tokens for CI pipelines, environment variable + secret file fetch endpoint, token revocation, audit logging, example snippets for GitHub Actions and GitLab CI |
| Environment templates              | Clone environment variable structure to new environment, save reusable templates, template-vs-environment diff                                                                        |
| Secret file bundler                | One-click encrypted .zip download of selected variables + secret files per environment, one-time password encryption, shareable via one-time link                                     |
| Health score engine                | Composite score from dependency freshness + vulnerability count + env hygiene + secret rotation age                                                                                   |
| Dashboard — final                  | Sortable/filterable project cards with health scores, git scan status, alerts, and last updated                                                                                       |
| Notifications                      | Email alerts for new vulnerabilities, rotation reminders, env drift warnings, git leak detection alerts, CI token expiration notices                                                  |
| Security audit                     | Automated CI checks for plaintext secret leakage in logs/responses, pre-commit hooks for secret scanning, verify zero-leakage guarantees end-to-end                                   |
| CD pipeline                        | GitHub Actions deploy workflow to production environment                                                                                                                              |
