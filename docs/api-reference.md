# API Reference

## Live Documentation

Interactive Swagger UI is available at: **[https://depvault.com/api/swagger](https://depvault.com/api/swagger)**

The Swagger docs are auto-generated from TypeBox schemas and reflect every endpoint, request body, query parameter, and response shape. Use Swagger for the full endpoint catalog.

---

## Authentication

DepVault uses JWT-based authentication with httpOnly cookies.

**Flow:**

1. Register or log in via `/api/auth/register` or `/api/auth/login`
2. The server sets a JWT access token (1 day expiry) and a refresh token (7 day expiry) as httpOnly cookies
3. All subsequent requests include the cookies automatically
4. When the access token expires, the client calls `/api/auth/refresh` to obtain a new token pair (the old refresh token is invalidated)

---

## API Groups Overview

The REST API is organized into the following groups under the `/api` prefix:

| Group                  | Description                                                                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth**               | Registration, login, logout, token refresh, GitHub OAuth, email verification, password reset                                             |
| **Projects**           | CRUD operations for projects (a project maps to a repo)                                                                                  |
| **Members**            | Invite, update roles, and remove team members within a project                                                                           |
| **Apps**               | List/create/update/delete apps, fetch the repo map, and export encrypted blobs                                                           |
| **Files**              | Push, save (web), get content, list, version history, and restore client-encrypted file blobs (config + secret, discriminated by `kind`) |
| **Vault**              | Client-side encryption: UserVault setup/status, password change, recovery                                                                |
| **Key Grants**         | Per-project wrapped DEK grants (SELF / ECDH / RECOVERY)                                                                                  |
| **Share Links**        | Generate encrypted one-time share links for a file (create / list / revoke)                                                              |
| **Public Shares**      | Recipient-facing endpoints to access and consume one-time links                                                                          |
| **Analysis**           | Upload dependency files, run vulnerability scans, view results                                                                           |
| **Security Dashboard** | Aggregated security overview (vulnerabilities, scan results, file freshness)                                                             |
| **Secret Scan**        | Git repository scanning for leaked secrets                                                                                               |
| **Scan Patterns**      | Manage regex patterns (built-in + custom) for secret detection                                                                           |
| **CI Tokens**          | Generate and manage CI/CD tokens scoped to an app + environment                                                                          |
| **CI Access**          | Endpoints for CI pipelines to fetch encrypted file blobs at build time                                                                   |
| **License Rules**      | Configure per-project license compliance policies (allow/warn/block)                                                                     |
| **Subscription**       | Plan limits, usage, and billing management                                                                                               |
| **Audit Log**          | Append-only log of file-related operations                                                                                               |
| **Notifications**      | User notification listing and management                                                                                                 |
| **Users**              | Profile management (name, avatar, password)                                                                                              |
| **GitHub API**         | List repos and browse repository file trees                                                                                              |

---

## Repo-Native Storage Endpoints

These are the core endpoints for the repo-native model (Project → App → RepoFile). A `RepoFile` is one client-encrypted blob discriminated by a `kind` (`CONFIG` | `SECRET`); identity is `(projectId, relativePath)` and `appId` is a mutable grouping pointer. All file content is client-encrypted; the server only ever stores and returns ciphertext as base64 blobs (`encryptedContent` + `iv` + `authTag`). See Swagger for full request/response schemas.

### Apps

| Method   | Path                            | Description                                                               |
| -------- | ------------------------------- | ------------------------------------------------------------------------- |
| `GET`    | `/api/projects/:id/apps`        | List apps with file counts and the environments present                   |
| `POST`   | `/api/projects/:id/apps`        | Create an app (`name`, `appPath`); `appPath` is unique within the project |
| `GET`    | `/api/projects/:id/apps/:appId` | Get a single app with its file counts and derived environments            |
| `PATCH`  | `/api/projects/:id/apps/:appId` | Update an app's display name                                              |
| `DELETE` | `/api/projects/:id/apps/:appId` | Delete an app and all of its files and version history                    |
| `GET`    | `/api/projects/:id/repo-map`    | Full repo map: every app with file **metadata** (no blobs)                |
| `POST`   | `/api/projects/:id/export`      | Export encrypted blobs for a file, environment, app, or whole repo        |

### Files

All config and secret files share one set of endpoints. Each file is a client-encrypted blob discriminated by `kind` (`CONFIG` | `SECRET`); push and list bodies carry/filter on `kind`. Identity is `(projectId, relativePath)`; the owning `appId` is a mutable grouping pointer, so re-parenting a file keeps the same row and version history.

| Method   | Path                                                          | Description                                                                                                                                                        |
| -------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POST`   | `/api/projects/:id/files/push`                                | CLI push: upsert the owning app by path, then create/replace the file (prior content saved as a version); body carries `kind`. Rejects executable types; max 25 MB |
| `GET`    | `/api/projects/:id/files`                                     | List file metadata, paginated (filter by `appId` / `environmentSlug` / `kind`)                                                                                     |
| `GET`    | `/api/projects/:id/files/:fileId`                             | Get a file's encrypted content + crypto params                                                                                                                     |
| `PUT`    | `/api/projects/:id/files/:fileId`                             | Web save: replace content with a new blob, snapshotting the prior version                                                                                          |
| `PATCH`  | `/api/projects/:id/files/:fileId`                             | Update metadata (description, `environmentSlug`)                                                                                                                   |
| `DELETE` | `/api/projects/:id/files/:fileId`                             | Delete a file and cascade its version history                                                                                                                      |
| `GET`    | `/api/projects/:id/files/:fileId/versions`                    | List version history metadata (newest first)                                                                                                                       |
| `GET`    | `/api/projects/:id/files/:fileId/versions/:versionId`         | Get a specific version's encrypted content (for diff/restore)                                                                                                      |
| `POST`   | `/api/projects/:id/files/:fileId/versions/:versionId/restore` | Restore a file to a previous version                                                                                                                               |

### Share Links

One-time encrypted file sharing. The decryption key travels in the URL fragment and never reaches the server; the encrypted payload is destroyed after the first read or at expiry. The public page lives at `/s/:token`.

| Method   | Path                                | Description                                                                   |
| -------- | ----------------------------------- | ----------------------------------------------------------------------------- |
| `POST`   | `/api/projects/:id/shares`          | Create a one-time share link for a file (optional password, expiry)           |
| `GET`    | `/api/projects/:id/shares`          | List a project's share links with status (PENDING / VIEWED / EXPIRED)         |
| `DELETE` | `/api/projects/:id/shares/:shareId` | Revoke a share link                                                           |
| `GET`    | `/api/shares/:token/info`           | Public: fetch share metadata (expiry, password requirement) without consuming |
| `POST`   | `/api/shares/:token`                | Public: consume the link and return the encrypted payload (one-time)          |

### CI/CD

| Method   | Path                                   | Description                                                                                                                 |
| -------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `POST`   | `/api/projects/:id/ci-tokens`          | Create a token scoped to `{ name, appId, environmentSlug, ...wrappedDek }` (JWT auth)                                       |
| `GET`    | `/api/projects/:id/ci-tokens`          | List a project's CI tokens (JWT auth)                                                                                       |
| `DELETE` | `/api/projects/:id/ci-tokens/:tokenId` | Revoke a CI token (JWT auth)                                                                                                |
| `GET`    | `/api/ci/secrets`                      | CI-token auth: returns `{ wrappedDek*, files[] }` (base + token's environment) as ciphertext; each entry carries its `kind` |
| `GET`    | `/api/ci/secrets/files/:fileId`        | CI-token auth: download one encrypted file blob                                                                             |

---

## Error Responses

All error responses follow a consistent shape:

```json
{
  "error": "Not Found",
  "message": "Project not found",
  "statusCode": 404
}
```

Common status codes:

- **400** Bad Request -- validation error or malformed input
- **401** Unauthorized -- missing or expired JWT
- **403** Forbidden -- insufficient role for the requested action
- **404** Not Found -- resource does not exist
- **409** Conflict -- duplicate resource (e.g., member already invited)
- **429** Too Many Requests -- rate limit exceeded (auth endpoints)

---

## Rate Limiting

Auth endpoints are rate-limited at the Nginx layer:

- Login, register, password reset: 5 requests/second with burst of 10

Secret access and share link endpoints have additional application-level rate limiting.
