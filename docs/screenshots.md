# Screenshots

A visual tour of DepVault organized by feature area. All screenshots are from the production deployment.

---

## Dashboard

The main dashboard showing all projects with health scores, dependency counts, and last analysis dates.

![Dashboard](images/dashboard.jpg)

---

## Project Management

### Project Overview

Project detail page with summary cards for dependencies, environments, vulnerabilities, and team members.

![Project Overview](images/project-overview.jpg)

### Project Settings

Project configuration including name, description, repository URL, danger zone, and member management.

![Project Settings](images/project-settings.jpg)

---

## Dependency Analysis

### Analysis Results

Parsed dependency list showing package names, current and latest versions, update status badges, and vulnerability indicators.

![Dependency Analysis Results](images/project-dependencies-1.jpg)

### Vulnerability Details

Expanded view with vulnerability severity ratings, CVE IDs, license information, and health scores per dependency.

![Dependency Vulnerability Details](images/project-dependencies-2.jpg)

---

## Repo Browser

### Config Files

Repo browser for a selected app and environment: config files shown in the Form (key/value) or Raw (CodeMirror) editor, with values masked by default. Each file is one client-encrypted blob.

![Config Files](images/project-env-vars.jpg)

### File Version History & Diff

Version history for a config file with a git-style diff between any two versions, computed client-side after decrypt, plus restore-to-version.

![File Version History](images/project-env-vars-history.jpg)

### Environment Selector

Switch between environment slugs (base, dev, prod, staging, or custom) to browse each app's files for that environment.

![Environment Selector](images/env-template.jpg)

---

## Secret Management

### Secret Files

Encrypted file storage showing pushed certificates, keys, and credentials per app at their repo-relative paths, with metadata and download options.

![Secret Files](images/project-secret-files.jpg)

### Share File

One-time encrypted link generation for a config or secret file with configurable expiration and optional password protection; the decryption key lives only in the URL fragment.

![Share File](images/share-secret.jpg)

### Download Bundle

Encrypted archive download of selected config and secret files for an app + environment as a single .zip bundle.

![Download Bundle](images/download-bundle.jpg)

---

## Security

### Security Dashboard

Aggregated security overview showing vulnerability counts, secret scan status, rotation age indicators, and compliance summary.

![Security Dashboard](images/security-page.jpg)

---

## CI/CD Integration

### CI Integration

CI/CD pipeline configuration showing how to inject secrets into GitHub Actions and other CI providers using scoped tokens.

![CI Integration](images/ci-integration.jpg)

### Generate CI Token

Token generation form with environment scope, expiration duration, and optional IP allowlist.

![Generate CI Token](images/generate-ci-token.jpg)

---

## Tools

### Format Converter

Convert between .env, JSON, YAML, and TOML configuration formats with live preview.

![Format Converter](images/converter.jpg)

---

## Activity

### Activity Log

Chronological feed of project actions including variable changes, file uploads, secret shares, and member updates.

![Activity Log](images/activity-log.jpg)
