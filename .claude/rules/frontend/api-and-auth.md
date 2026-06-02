---
description: API client setup and auth architecture
paths: [apps/frontend/src/**]
---

# API Client & Auth

## API Clients

- **Client** (`src/lib/api.ts`): Eden Treaty via `createApiClient()` from `@depvault/shared/api`, `credentials: "include"` for cookie auth
- **Server** (`src/lib/api-server.ts`): reads + forwards cookies from `next/headers`. No `server-only` directive

## Auth Flow

- Backend sets httpOnly cookies (`access_token`, `refresh_token`) on login/register/refresh/github-callback; frontend sends them via `credentials: "include"`
- Backend auth middleware checks `Authorization` header first, then falls back to `cookie.access_token`
- Logout is a POST that clears cookies

## Auth Provider

- `auth-provider.tsx` manages user state with SSR hydration via `initialUser` (dashboard layout fetches user server-side)
- `useAuth()` (`hooks/use-auth.ts`) uses React 19 `use(AuthContext)`

## Vault Provider

- `vault-provider.tsx` manages vault state: unlock/lock/setup, DEK cache per project. KEK/DEK/private key held in `useRef` (not state) to avoid serialization; cleared on lock/logout; auto-locks after 30 min idle
- Dashboard layout wraps content in `<VaultProvider>` (inside `<AuthProvider>`)
- `useVault()` (`hooks/use-vault.ts`) — use for all encryption. Methods: `unlockVault`, `setupVault`, `getProjectDEK`, `initializeProjectKeys`, `grantProjectKeyToMember`

## Type Inference & Fetching

- Run `bun run build:types` in `apps/backend/` to emit declarations in `dist/`. `@elysiajs/eden` must be a frontend devDependency; `@depvault/shared` is a `workspace:*` dep
- Never call `fetch` directly in components — use the Eden Treaty client through `useApiQuery` / `useApiMutation` (React Query wrappers)
