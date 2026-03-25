---
description: API client setup and auth architecture
paths: [apps/frontend/src/**]
---

# API Client & Auth

## Client-Side API Client

Located at `src/lib/api.ts`. Uses Eden Treaty via `createApiClient()` from `@depvault/shared/api` with `credentials: "include"` for cookie auth.

## Server-Side API Client

Located at `src/lib/api-server.ts`. Reads cookies from `next/headers` and forwards them. No `server-only` directive.

## Auth Flow

- Backend sets httpOnly cookies (`access_token`, `refresh_token`) on login/register/refresh/github-callback
- Frontend sends cookies automatically via `credentials: "include"`
- Auth middleware on backend has cookie fallback: checks `Authorization` header first, then `cookie.access_token`
- Logout is a POST endpoint that clears cookies

## Auth Provider

- `src/providers/auth-provider.tsx` manages user state with SSR hydration via `initialUser` prop
- Dashboard layout fetches user server-side and passes to AuthProvider
- `useAuth()` hook in `src/hooks/use-auth.ts` uses React 19 `use(AuthContext)`

## Vault Provider

- `src/providers/vault-provider.tsx` manages vault state: unlock/lock/setup, KEK + ECDH private key in memory refs, DEK cache per project
- Dashboard layout wraps content with `<VaultProvider>` (inside `<AuthProvider>`)
- `useVault()` hook in `src/hooks/use-vault.ts` — use for all encryption operations
- Key methods: `unlockVault`, `setupVault`, `getProjectDEK`, `initializeProjectKeys`, `grantProjectKeyToMember`
- KEK/DEK/private key held in `useRef` (not state) to avoid serialization — cleared on lock/logout
- Auto-locks after 30 min idle

## Backend Type Inference

- Run `bun run build:types` in `apps/backend/` to generate declaration files in `dist/`
- `@elysiajs/eden` must be a devDependency in the frontend for Treaty types to work
- `@depvault/shared` is a `workspace:*` dependency (not from npm)

## API Fetching

- Never use `fetch` API directly in components. Use `useApiQuery` and `useApiMutation` hooks that wrap API calls with React Query.
- Use Eden Treaty API client for all API calls, never direct `fetch`.
