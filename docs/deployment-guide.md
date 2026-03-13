# Deployment Guide

## Prerequisites

- **Docker** and **Docker Compose** (v2+)
- **PostgreSQL 18+** (external, not containerized in the default setup)
- A **domain name** pointed to your server's IP address
- An **SSL certificate** (via Certbot / Let's Encrypt)
- **Nginx** installed on the host for reverse proxy
- A **GitHub OAuth App** for social login (optional but recommended)
- A **Resend** account for transactional email (verification, password reset)

---

## Environment Variables

Create a `.env` file based on the root `.env.example`. All variables are listed below with descriptions.

### Database

| Variable       | Required | Default | Description                                                                    |
| -------------- | -------- | ------- | ------------------------------------------------------------------------------ |
| `DATABASE_URL` | Yes      | --      | PostgreSQL connection string, e.g. `postgresql://user:pass@host:5432/depvault` |

### Authentication

| Variable               | Required | Default | Description                                                    |
| ---------------------- | -------- | ------- | -------------------------------------------------------------- |
| `JWT_SECRET`           | Yes      | --      | Secret key for signing JWT tokens. Use a random 256-bit string |
| `JWT_EXPIRY`           | No       | `1d`    | Access token expiry duration                                   |
| `REFRESH_TOKEN_EXPIRY` | No       | `7d`    | Refresh token expiry duration                                  |

### Encryption

| Variable                | Required | Default | Description                                                      |
| ----------------------- | -------- | ------- | ---------------------------------------------------------------- |
| `MASTER_ENCRYPTION_KEY` | Yes      | --      | 256-bit key (64 hex chars) for AES-256-GCM encryption of secrets |

### Server

| Variable        | Required | Default      | Description                                                       |
| --------------- | -------- | ------------ | ----------------------------------------------------------------- |
| `BACKEND_PORT`  | No       | `4000`       | Port the backend container exposes on the host                    |
| `FRONTEND_PORT` | No       | `4001`       | Port the frontend container exposes on the host                   |
| `NODE_ENV`      | No       | `production` | Set to `production` for deployed environments                     |
| `LOG_LEVEL`     | No       | `info`       | Log verbosity: `fatal`, `error`, `warn`, `info`, `debug`, `trace` |

### CORS and URLs

| Variable              | Required | Default | Description                                                        |
| --------------------- | -------- | ------- | ------------------------------------------------------------------ |
| `CORS_ORIGINS`        | Yes      | --      | Allowed origins for CORS (your frontend domain)                    |
| `FRONTEND_URL`        | Yes      | --      | Public URL of the frontend (used in emails and redirects)          |
| `NEXT_PUBLIC_API_URL` | Yes      | --      | Public URL of the backend API (used by the frontend at build time) |

### GitHub OAuth

| Variable               | Required | Default | Description                                                                      |
| ---------------------- | -------- | ------- | -------------------------------------------------------------------------------- |
| `GITHUB_CLIENT_ID`     | Yes\*    | --      | GitHub OAuth App client ID                                                       |
| `GITHUB_CLIENT_SECRET` | Yes\*    | --      | GitHub OAuth App client secret                                                   |
| `GITHUB_CALLBACK_URL`  | Yes\*    | --      | OAuth callback URL, e.g. `https://depvault.example.com/api/auth/github/callback` |

\*Required only if GitHub OAuth login is enabled.

### Email (Resend)

| Variable             | Required | Default                | Description                      |
| -------------------- | -------- | ---------------------- | -------------------------------- |
| `RESEND_API_KEY`     | Yes      | --                     | API key from your Resend account |
| `EMAIL_FROM_NAME`    | No       | `DepVault`             | Sender name for outgoing emails  |
| `EMAIL_FROM_ADDRESS` | No       | `noreply@depvault.com` | Sender email address             |

### File Uploads

| Variable     | Required | Default     | Description                                            |
| ------------ | -------- | ----------- | ------------------------------------------------------ |
| `UPLOAD_DIR` | No       | `./uploads` | Directory for file uploads (mapped to a Docker volume) |

---

## Local Development

For local development, refer to the main [README.md](../README.md). In short:

```bash
# Install dependencies
bun install

# Set up backend .env from template
cp apps/backend/.env.example apps/backend/.env
# Edit apps/backend/.env with your local values

# Generate Prisma client and apply migrations
cd apps/backend
bun run db:generate
bun run db:migrate:apply

# Start backend (port 4000)
bun run dev

# In another terminal, start frontend (port 4001)
cd apps/frontend
bun run dev
```

---

## Docker Compose Deployment

The production setup uses Docker Compose with pre-built images from GitHub Container Registry (GHCR).

### 1. Prepare the server

```bash
# Create deployment directory
mkdir -p ~/deploy/depvault
cd ~/deploy/depvault

# Copy deploy/docker-compose.yml and .env to the server
# (the CI/CD pipeline does this automatically)
```

### 2. Create the .env file

```bash
cp .env.example .env
# Edit .env with production values
```

Generate secure values for `JWT_SECRET` and `MASTER_ENCRYPTION_KEY`:

```bash
# 256-bit random hex string
openssl rand -hex 32
```

### 3. Start the services

```bash
# Login to GHCR
echo "$GHCR_PAT" | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# Pull and start
docker compose pull
docker compose up -d
```

### 4. Verify

```bash
# Check container status
docker compose ps

# Check backend health
curl http://localhost:4000/health
```

The `deploy/docker-compose.yml` defines two services:

- **backend** -- Elysia API on port 4000, with a persistent volume for uploads
- **frontend** -- Next.js on port 4001, depends on backend health check

Both containers bind to `127.0.0.1` only, so they are accessible only through the Nginx reverse proxy.

---

## Nginx Configuration

The Nginx config lives at `deploy/depvault.conf`.

### Install

```bash
sudo cp deploy/depvault.conf /etc/nginx/sites-available/depvault.conf
sudo ln -s /etc/nginx/sites-available/depvault.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### What it does

- Routes `/api/*` and `/health` to the backend (port 4000)
- Routes everything else to the frontend (port 4001)
- Rate-limits auth endpoints (`/api/auth/login`, `/api/auth/register`, `/api/auth/reset-password`) at 5 req/s with burst of 10
- Adds security headers: `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`, `HSTS`, `CSP`
- Enables gzip compression
- Sets `client_max_body_size 50M` for file uploads
- Caches `/_next/static` assets for 365 days

---

## SSL Setup with Certbot

After Nginx is configured and running:

```bash
# Install Certbot
sudo apt install certbot

# Obtain certificate (auto-configures Nginx)
sudo certbot --nginx -d depvault.example.com

# Verify auto-renewal
sudo certbot renew --dry-run
```

Certbot will modify the Nginx config to add the `listen 443 ssl` block and redirect HTTP to HTTPS.

---

## CI/CD Pipeline

### CI Pipeline (`ci.yml`)

Runs on every push and pull request to `main` and `prod` branches.

**Steps:**

1. Checkout code
2. Setup Bun runtime
3. Install dependencies (frozen lockfile)
4. Format check (Prettier)
5. Generate Prisma client
6. Typecheck backend and frontend
7. Run backend tests
8. Build frontend
9. Secret scanning (Gitleaks)
10. Dependency audit

### Deploy Pipeline (`deploy.yml`)

Runs on push to the `prod` branch (or manual dispatch).

**Steps:**

1. **Build job** -- Builds Docker images for backend and frontend in parallel, pushes to GHCR
2. **Deploy job** -- SSHs into the VPS, pulls latest images, runs `docker compose up -d`
3. **Health check** -- Waits 15 seconds, verifies backend responds at `/health`

### Required GitHub Secrets

| Secret        | Description                                                           |
| ------------- | --------------------------------------------------------------------- |
| `VPS_HOST`    | VPS IP address or hostname                                            |
| `VPS_USER`    | SSH username for deployment                                           |
| `VPS_SSH_KEY` | SSH private key for VPS access                                        |
| `GHCR_PAT`    | Personal Access Token with `read:packages` and `write:packages` scope |
| `ENV_DOCKER`  | Full `.env` file content for docker-compose on the server             |

### Required GitHub Variables

| Variable              | Description                                                    |
| --------------------- | -------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | Public backend API URL (baked into the frontend at build time) |

---

## Health Checks

| Endpoint      | Port | Description                                                            |
| ------------- | ---- | ---------------------------------------------------------------------- |
| `GET /health` | 4000 | Backend health check, returns `{ "status": "ok", "timestamp": "..." }` |
| Frontend      | 4001 | Next.js serves pages; a 200 on `/` confirms it is running              |

The Docker Compose setup uses the backend health check as a dependency condition for the frontend container.

---

## Troubleshooting

**Containers not starting:**

```bash
docker compose logs backend
docker compose logs frontend
```

**Database connection issues:**

- Verify `DATABASE_URL` is reachable from the Docker network
- If PostgreSQL is on the host, use `host.docker.internal` or the host's IP (not `localhost`)

**CORS errors in the browser:**

- Ensure `CORS_ORIGINS` matches the exact frontend URL (including protocol and port if non-standard)

**Email not sending:**

- Verify `RESEND_API_KEY` is set correctly
- Check that `EMAIL_FROM_ADDRESS` uses a domain verified in your Resend account
