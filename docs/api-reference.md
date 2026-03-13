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

| Group                         | Description                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------------- |
| **Auth**                      | Registration, login, logout, token refresh, GitHub OAuth, email verification, password reset |
| **Projects**                  | CRUD operations for projects                                                                 |
| **Members**                   | Invite, update roles, and remove team members within a project                               |
| **Vault Groups**              | Logical grouping of environments within a project                                            |
| **Environments**              | Create and manage environments (dev, staging, production) per project                        |
| **Environment Variables**     | Encrypted key-value storage with version history                                             |
| **Environment Diff**          | Side-by-side variable comparison across environments                                         |
| **Environment Import/Export** | Bulk import and export in `.env`, JSON, YAML, and TOML formats                               |
| **Environment Bundle**        | Download encrypted `.zip` archives of variables and secret files                             |
| **Environment Templates**     | Create reusable environment structure templates and apply them                               |
| **Secret Files**              | Encrypted binary file storage (SSL certs, keys, keystores) with versioning                   |
| **Secrets (One-Time Links)**  | Generate encrypted one-time share links for variables or files                               |
| **Shared Secrets**            | Recipient-facing endpoints to access and consume one-time links                              |
| **Analysis**                  | Upload dependency files, run vulnerability scans, view results                               |
| **Convert**                   | Format conversion between `.env`, JSON, YAML, and TOML                                       |
| **Security Dashboard**        | Aggregated security overview (vulnerabilities, scan results, rotation status)                |
| **Secret Scan**               | Git repository scanning for leaked secrets                                                   |
| **Scan Patterns**             | Manage regex patterns (built-in + custom) for secret detection                               |
| **CI Tokens**                 | Generate and manage CI/CD pipeline access tokens                                             |
| **CI Access**                 | Endpoints for CI pipelines to fetch secrets at build time                                    |
| **License Rules**             | Configure per-project license compliance policies (allow/warn/block)                         |
| **Activity Log**              | Project-level activity feed                                                                  |
| **Audit Log**                 | Append-only log of secret-related operations                                                 |
| **Notifications**             | User notification listing and management                                                     |
| **Users**                     | Profile management (name, avatar, password)                                                  |
| **GitHub API**                | List repos and browse repository file trees                                                  |

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
