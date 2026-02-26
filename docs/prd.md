# DepVault — Product Requirements Document

## 1. Overview

**Project Name:** DepVault
**Description:** A unified developer dashboard to analyze packages, scan for vulnerabilities, and securely store and sync environment variables across every major language ecosystem and config format.
**Tech Stack:** Next.js 16 (frontend), MUI 7 (UI components), Tailwind CSS v4 (optional utility styling), ElysiaJS (backend API), Prisma (ORM), PostgreSQL (database), TypeScript (end-to-end), GitHub Actions (CI/CD)

---

## 2. Problem Statement

Developers working across multiple projects and tech stacks waste time switching between ecosystem-specific tools to check dependency health, track vulnerabilities, and manage environment variables. Secrets get shared over Slack, .env files drift between environments, and outdated packages go unnoticed until something breaks. There is no single tool that handles both dependency analysis and secret management across every major ecosystem.

---

## 3. Goals

- Provide a single dashboard to analyze dependencies from any major package manager
- Detect outdated packages, known vulnerabilities, and license conflicts automatically
- Offer encrypted storage for environment variables with team sharing and environment diffing
- Support multi-project management with at-a-glance health scores
- Deliver a clean, fast developer experience with minimal setup friction

---

## 4. User Personas

- **Solo Full-Stack Developer** — Works across multiple projects in different stacks. Needs one place to track dependency health and store env variables instead of juggling ecosystem-specific tools.
- **Tech Lead at a Startup** — Manages several microservices with a small team. Needs visibility into vulnerabilities across services and a secure way to onboard new hires with the right secrets.
- **Junior Developer Joining a Team** — New to a codebase with dozens of env vars. Needs a clear setup checklist and a quick read on the project's dependency landscape.

---

## 5. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Next.js (App Router) | 16 |
| UI Library | MUI (Material UI) | 7 |
| Utility CSS | Tailwind CSS (optional) | 4 |
| Backend API | ElysiaJS (Bun runtime) | Latest |
| ORM | Prisma | Latest |
| Database | PostgreSQL | 16+ |
| Language | TypeScript | 5.x |
| Auth | Email/password + GitHub OAuth + JWT | — |
| Encryption | AES-256-GCM | — |
| Password Hashing | bcrypt | — |
| External APIs | npm, PyPI, crates.io, NuGet, OSV.dev, GitHub Advisory | — |
| CI/CD | GitHub Actions | — |
| Containerization | Docker / Docker Compose | — |

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

### Secret Sharing

- Generate encrypted one-time-read links
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

### Notifications

- Email alerts for newly discovered vulnerabilities
- Secret rotation reminders
- Environment drift warnings when variables are missing across environments
- Team invite and role change notifications

### Supported Formats

**Dependency files:**

| Ecosystem | Files |
|-----------|-------|
| Node.js | package.json, package-lock.json, yarn.lock |
| Python | requirements.txt, pyproject.toml, Pipfile, poetry.lock |
| Rust | Cargo.toml, Cargo.lock |
| .NET | .csproj, packages.config, Directory.Packages.props |
| Go | go.mod |
| Java/Kotlin | pom.xml, build.gradle |
| Ruby | Gemfile |
| PHP | composer.json |

**Environment/config files:**

| Format | Files |
|--------|-------|
| Dotenv | .env, .env.local, .env.production, .env.development |
| .NET | appsettings.json, appsettings.Production.json |
| Kubernetes | secrets.yaml, values.yaml |
| Spring Boot | application.properties, application.yml |
| Generic | config.toml, config.yaml |

---

## 7. Non-Functional Requirements

- **Performance:** Dashboard loads in under 2 seconds. Dependency analysis completes within 10 seconds for files with up to 500 packages.
- **Security:** All secrets encrypted at rest with AES-256-GCM. HTTPS enforced. No plaintext secrets in logs or database. Passwords hashed with bcrypt.
- **Scalability:** Support up to 50 projects per user and 500 env variables per project.
- **Accessibility:** WCAG 2.1 AA compliance via MUI 7's built-in accessibility features.
- **Browser Support:** Latest versions of Chrome, Firefox, Safari, and Edge.

---

## 8. User Stories & Acceptance Criteria

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

### US-06: Store and Retrieve Environment Variables

**As a** developer, **I want to** securely store my project's environment variables in an encrypted vault **so that** I don't rely on scattered local .env files.

**Acceptance Criteria:**

- User can CRUD env variables per project per environment
- All values are encrypted at rest using AES-256-GCM
- Bulk import from any supported config format works correctly
- Bulk export to any supported config format works correctly
- Each variable supports an optional description and validation rule
- Vault is accessible only by authorized project members

### US-07: Share Secrets via One-Time Links

**As a** team member, **I want to** share a secret via an encrypted one-time link **so that** credentials don't sit in Slack or email history.

**Acceptance Criteria:**

- User can generate a shareable link for one or more secrets
- Link is single-use and content is destroyed after first access
- Optional password protection can be added
- Link auto-expires after a user-defined duration
- Creator can see link status (pending, viewed, expired) in an audit log

### US-08: Multi-Project Dashboard

**As a** developer managing multiple projects, **I want to** see health scores across all my projects **so that** I know which needs attention first.

**Acceptance Criteria:**

- Dashboard shows all projects in a card or table layout
- Each project shows a health score based on dependency freshness, vulnerability count, and env hygiene
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

---

## 9. Sprint Plan

### Sprint 1 — Foundation & Core Analysis (2 weeks)

**Goal:** Users can register, log in, create projects, and analyze Node.js and Python dependency files.

| Task | Details |
|------|---------|
| Project setup | Initialize Next.js 16, ElysiaJS, Prisma, PostgreSQL, Docker Compose |
| CI pipeline | GitHub Actions workflow for lint, type-check, test, and build on every PR |
| Auth — email/password | Registration, login, email verification, password reset, JWT issuance |
| Auth — GitHub OAuth | OAuth flow, account creation, account linking |
| Database schema | Users, projects, members, analyses, dependencies tables via Prisma migrate |
| Project CRUD | Create, edit, delete projects with basic settings |
| Team invites | Invite members by email, role assignment (owner/editor/viewer) |
| Dependency parser — Node.js | Parse package.json and package-lock.json, resolve versions |
| Dependency parser — Python | Parse requirements.txt and pyproject.toml, resolve versions |
| Version checker | Query npm and PyPI registries for latest versions |
| Vulnerability scanner | Cross-reference parsed packages against OSV.dev and GitHub Advisory |
| Analysis results UI | Table view with version status, vulnerability badges, and severity indicators |
| Dashboard — basic | Project list with names, last analyzed date, and placeholder health scores |

### Sprint 2 — Env Vault, Secret Sharing & Polish (2 weeks)

**Goal:** Users can store encrypted env variables, compare environments, share secrets, and view dependency trees. Expand ecosystem support.

| Task | Details |
|------|---------|
| Env variable CRUD | Create, read, update, delete variables per environment with AES-256-GCM encryption |
| Bulk import/export | Import from .env, appsettings.json, secrets.yaml; export to any supported format |
| Environment diff | Side-by-side comparison view with missing/mismatched variable highlighting |
| Format converter | Convert between all supported config formats with preview |
| Secret sharing | One-time encrypted links with password protection and auto-expiration |
| Audit log | Track link creation, access, and expiration events |
| Secret rotation | Rotation policy config, age indicators, email reminders |
| Dependency tree visualization | Interactive graph with search, zoom, and color-coded nodes |
| License detection | Detect license per dependency, configurable policy, compliance summary |
| Onboarding checklist | Required variable flags, per-user completion tracking, .env.example export |
| Dependency parser — Rust, .NET, Go | Parse Cargo.toml, .csproj, go.mod |
| Health score engine | Composite score from dependency freshness + vulnerability count + env hygiene |
| Dashboard — final | Sortable/filterable project cards with health scores, alerts, and last updated |
| Notifications | Email alerts for new vulnerabilities, rotation reminders, env drift warnings |
| CD pipeline | GitHub Actions deploy workflow to production environment |
