# DepVault Frontend Implementation Plan

## Context

The DepVault backend is fully built with 9 feature modules (auth, projects, analysis, env-variables, secret-files, secrets, users, audit-log, convert). The frontend currently has only a root layout with MUI ThemeProvider, a placeholder home page, and i18n setup. This plan covers building all frontend pages and components to deliver the full DepVault experience — a professional, polished developer dashboard for dependency analysis, environment variable management, and secret file storage.

## Tech Decisions

- **Form library**: TanStack Form + Zod — native server action support, built for React 19
- **Client data fetching**: TanStack Query — caching, deduplication, optimistic updates for DataGrid/search/interactive data
- **SSR strategy**: Hybrid — SSR + `use cache` for initial data, server actions for form submissions, TanStack Query + Eden Treaty for client-side interactive data
- **UI**: MUI 7 + Tailwind v4 + MUI DataGrid
- **Notifications**: notistack (MUI-compatible)

---

## Phase 0: Dependencies

```bash
cd apps/frontend
bun add @tanstack/react-form @tanstack/zod-form-adapter @tanstack/react-query zod @mui/x-data-grid notistack @xyflow/react
```

Ensure `@depvault/shared` workspace dependency is available for the Eden Treaty API client.

---

## Phase 1: Foundation Infrastructure (~22 files)

### API & Data Layer

- `src/lib/api.ts` — Client-side Eden Treaty singleton using `createApiClient` from `@depvault/shared`, attaches access token from cookies
- `src/lib/api-server.ts` — Server-side Eden Treaty client using `next/headers` cookies() for SSR data fetching
- `src/lib/constants.ts` — Route paths object, cookie names, pagination defaults
- `src/actions/auth.ts` — Server actions: `loginAction`, `registerAction`, `forgotPasswordAction`, `resetPasswordAction`. Each calls backend API server-side, sets httpOnly cookies, returns result. Uses `"use server"` directive

### Auth System

- `src/providers/AuthProvider.tsx` — `"use client"` context: `user`, `isAuthenticated`, `isLoading`, `logout()`. Receives initial user from server component prop (SSR-hydrated, no client fetch on mount). Handles token refresh on 401
- `src/hooks/useAuth.ts` — Convenience context hook

### App Shell Layout

- `src/app/(auth)/layout.tsx` — Centered card layout, no sidebar. Server component
- `src/app/(dashboard)/layout.tsx` — Server component: fetches user via `api-server.ts` + `use cache`, passes to AuthProvider + AppShell. Redirects if unauthenticated
- `src/components/layout/AppShell.tsx` — `"use client"`. Persistent sidebar (240px collapsible to 64px) + top app bar (64px)
- `src/components/layout/Sidebar.tsx` — `"use client"`. MUI Drawer with nav: Dashboard, Converter, Profile. Project list section
- `src/components/layout/TopBar.tsx` — `"use client"`. AppBar with breadcrumbs, ThemeToggle, UserMenu
- `src/components/layout/ThemeToggle.tsx` — `"use client"`. Light/dark toggle via `useColorScheme()`
- `src/components/layout/UserMenu.tsx` — `"use client"`. Avatar + dropdown (Profile, Logout)

### Reusable UI Components

- `src/components/ui/PageHeader.tsx` — Title + subtitle + action buttons area
- `src/components/ui/LoadingScreen.tsx` — Centered CircularProgress with optional message
- `src/components/ui/EmptyState.tsx` — Icon + title + description + optional CTA button
- `src/components/ui/ConfirmDialog.tsx` — `"use client"`. MUI Dialog for destructive action confirmation
- `src/components/ui/StatusBadge.tsx` — MUI Chip with semantic color variants (success, warning, error, info)
- `src/components/ui/MaskedValue.tsx` — `"use client"`. Displays `••••••••` with eye toggle to reveal
- `src/components/ui/CopyButton.tsx` — `"use client"`. IconButton with clipboard copy + check feedback

### TanStack Query

- `src/providers/QueryProvider.tsx` — `"use client"`. Wraps `QueryClientProvider` with configured `QueryClient` (staleTime, retry, refetchOnWindowFocus). Placed in `(dashboard)/layout.tsx`
- `src/hooks/useApiQuery.ts` — Thin helper that combines Eden Treaty client calls with `useQuery`. Returns typed data with caching
- `src/hooks/useApiMutation.ts` — Thin helper combining Eden Treaty mutations with `useMutation`. Handles `invalidateQueries` on success, error toasts

### Notifications

- `src/providers/NotificationProvider.tsx` — `"use client"`. notistack SnackbarProvider with MUI styling
- `src/hooks/useNotification.ts` — `{ success, error, warning, info }` methods

### Route Protection

- `src/proxy.ts` — Next.js 16 proxy file for route protection. Redirects unauthenticated users from dashboard routes to `/login`, authenticated users from auth routes to `/`. Checks `access_token` cookie

### Backend Auth Cookie Support (prerequisite)

The backend currently returns tokens in JSON body and expects `Authorization: Bearer` header. We need to modify the backend auth endpoints to **also** set httpOnly cookies:

- Modify `auth.controller.ts` — After login/register/refresh, set `access_token` and `refresh_token` as httpOnly secure cookies via `set.cookie`
- Modify `auth.middleware.ts` — Read token from cookie header as fallback when no `Authorization` header is present
- Add `POST /api/auth/logout` — Clears auth cookies
- Files to modify: `apps/backend/src/modules/auth/auth.controller.ts`, `apps/backend/src/common/middleware/auth.middleware.ts`

### Frontend Type Aliases (`src/types/api/`)

Eden-inferred type aliases using `Treaty.Data` utility. One file per domain:

- `src/types/api/auth.ts` — `AuthResponse`, `UserProfile` inferred from `Treaty.Data<typeof client.api.auth.login.post>`, etc.
- `src/types/api/project.ts` — `Project`, `Member` from `Treaty.Data<typeof client.api.projects.get>`, `Treaty.Data<typeof client.api.projects({ id: "" }).members.get>`
- `src/types/api/analysis.ts` — `Analysis`, `Dependency`, `Vulnerability` from analysis endpoints
- `src/types/api/env-variable.ts` — `EnvVariable`, `ImportResult`, `ExportResult` from env-variable endpoints
- `src/types/api/secret-file.ts` — `SecretFile`, `SecretFileVersion` from secret endpoints
- `src/types/api/audit-log.ts` — `AuditLogEntry` from audit-log endpoint
- `src/types/api/convert.ts` — `ConvertResult` from convert endpoint
- `src/types/api/index.ts` — Barrel export

Pattern example:

```typescript
import type { Treaty } from "@elysiajs/eden";
import type { client } from "@/lib/api";

export type Project = NonNullable<Treaty.Data<typeof client.api.projects.get>>[0];
export type Member = NonNullable<Treaty.Data<typeof client.api.projects({ id: "" }).members.get>>[0];
```

**Data flow**: `(dashboard)/layout.tsx` (server) → `use cache` fetches user → passes as prop to `AuthProvider` (client) → wraps `AppShell`

---

## Phase 2: Auth Pages (~10 files)

All under `src/app/(auth)/` with centered card layout. Forms use **TanStack Form + Zod** with **server actions** for submission.

| Page            | Files                                                                          | Server Action                               |
| --------------- | ------------------------------------------------------------------------------ | ------------------------------------------- |
| Login           | `login/page.tsx` + `components/features/auth/LoginForm.tsx`                    | `actions/auth.ts → loginAction`             |
| Register        | `register/page.tsx` + `components/features/auth/RegisterForm.tsx`              | `actions/auth.ts → registerAction`          |
| Forgot Password | `forgot-password/page.tsx` + `components/features/auth/ForgotPasswordForm.tsx` | `actions/auth.ts → forgotPasswordAction`    |
| Reset Password  | `reset-password/page.tsx` + `components/features/auth/ResetPasswordForm.tsx`   | `actions/auth.ts → resetPasswordAction`     |
| Verify Email    | `verify-email/page.tsx`                                                        | `actions/auth.ts → verifyEmailAction`       |
| GitHub Callback | `github/callback/page.tsx`                                                     | Client-side: reads code from URL, calls API |

Shared:

- `src/components/features/auth/AuthCard.tsx` — Reusable card wrapper with logo + title
- `src/components/features/auth/schemas.ts` — Zod schemas for all auth forms

**Pattern**: Page (server) renders Form (client) → Form calls server action → server action calls backend API → sets cookies → returns result → Form shows success/error

---

## Phase 3: Dashboard & Project Management (~10 files)

### Dashboard

- `src/app/(dashboard)/page.tsx` — Server component with `use cache`: fetches projects, renders DashboardView
- `src/components/features/dashboard/DashboardView.tsx` — `"use client"`. Project grid with search bar. Search is client-side filtering
- `src/components/features/dashboard/ProjectCard.tsx` — MUI Card: name, description, date, member count. Click navigates to project
- `src/components/features/dashboard/CreateProjectDialog.tsx` — `"use client"`. TanStack Form dialog: name + description. Server action: `actions/project.ts → createProjectAction`. Calls `revalidateTag("projects")` on success
- `src/actions/project.ts` — Server actions: `createProjectAction`, `updateProjectAction`, `deleteProjectAction`

**Consumes:** `GET /projects` (SSR + cache), `POST /projects` (server action)

### Project Detail (Tabbed)

- `src/app/(dashboard)/projects/[id]/page.tsx` — Server component with `use cache`: fetches project + members, renders ProjectDetailView
- `src/components/features/project/ProjectDetailView.tsx` — `"use client"`. MUI Tabs: Overview, Analysis, Env Vault, Secret Files, Members, Audit Log, Settings. Tab via `?tab=` query param
- `src/components/features/project/ProjectOverview.tsx` — Summary cards (dependencies, environments, members). Data from server props
- `src/components/features/project/ProjectSettings.tsx` — `"use client"`. TanStack Form for name/description. Danger zone: delete with ConfirmDialog. Server actions
- `src/providers/ProjectProvider.tsx` — `"use client"`. Context: current project data, user role, `refresh()` that calls `revalidateTag`

**Consumes:** `GET /projects/:id` (SSR + cache), `PUT /projects/:id` (server action), `DELETE /projects/:id` (server action)

---

## Phase 4: Analysis Module (~5 files)

- `src/components/features/analysis/AnalysisTab.tsx` — `"use client"`. MUI DataGrid of analyses: file name, ecosystem chip, health score badge, date, actions. **Client-side API** for sort/filter/paginate
- `src/components/features/analysis/UploadAnalysisDialog.tsx` — `"use client"`. TanStack Form: file content textarea, ecosystem selector, file name. Server action: `actions/analysis.ts → createAnalysisAction`
- `src/components/features/analysis/AnalysisDetailView.tsx` — `"use client"`. Dependency DataGrid: name, versions, status badge, license, vulnerability count. Expandable rows for vulnerability details. **Client-side API** for fetching analysis by ID
- `src/components/features/analysis/HealthScoreBadge.tsx` — Circular progress 0-100 with color gradient (red→yellow→green)
- `src/components/features/analysis/VulnerabilityChip.tsx` — Severity-colored MUI Chip
- `src/actions/analysis.ts` — Server actions: `createAnalysisAction`, `deleteAnalysisAction`

**Consumes:** `POST /analyses` (server action), `GET /analyses/project/:projectId` (client API), `GET .../analysisId` (client API), `DELETE` (server action)

---

## Phase 4b: Dependency Tree Visualization — US-04 (~3 files)

Requires: `bun add @xyflow/react` (React Flow for interactive graph)

- `src/components/features/analysis/DependencyTreeView.tsx` — `"use client"`. Interactive React Flow graph: nodes are dependencies, edges are parent→child. Nodes color-coded by vulnerability status (green=clean, yellow=outdated, red=vulnerable). Expandable/collapsible subtrees. Search bar to highlight specific packages. Click node opens detail panel
- `src/components/features/analysis/DependencyNode.tsx` — Custom React Flow node: package name, version, severity badge. Styled with MUI Paper
- `src/components/features/analysis/DependencyDetailPanel.tsx` — `"use client"`. Side panel on node click: metadata, license, changelog link, vulnerability list

**Consumes:** `GET /analyses/project/:projectId/:analysisId` (client API — reuses analysis detail data with `parentId` relationships)

---

## Phase 5: Env Vault (~8 files)

- `src/components/features/env-vault/EnvVaultTab.tsx` — `"use client"`. Environment selector + variable table + action bar (import, export, .env.example)
- `src/components/features/env-vault/EnvironmentSelector.tsx` — `"use client"`. MUI ToggleButtonGroup for DEV/STAGING/PROD/CUSTOM
- `src/components/features/env-vault/VariableTable.tsx` — `"use client"`. MUI DataGrid: key, masked value (eye toggle), description, required badge, actions. **Client-side API** for listing (supports environment filter)
- `src/components/features/env-vault/CreateVariableDialog.tsx` — `"use client"`. TanStack Form: key, value, description, isRequired, validationRule. Server action
- `src/components/features/env-vault/EditVariableDialog.tsx` — `"use client"`. Same fields, pre-populated. Server action
- `src/components/features/env-vault/ImportDialog.tsx` — `"use client"`. TanStack Form: environment, format, content textarea. Shows imported/skipped counts. Server action
- `src/components/features/env-vault/ExportDialog.tsx` — `"use client"`. Environment + format selectors. **Client-side API** for fetching export content. Copy/download buttons
- `src/actions/env-variable.ts` — Server actions: `createVariableAction`, `updateVariableAction`, `deleteVariableAction`, `importVariablesAction`

**Consumes:** `GET/POST/PUT/DELETE /projects/:id/env-variables`, `POST .../import`, `GET .../export`, `GET .../example`

### Environment Diff View — US-05 (~2 files)

- `src/components/features/env-vault/EnvironmentDiffView.tsx` — `"use client"`. Side-by-side comparison of 2-3 environments. MUI DataGrid with columns per environment. Missing variables highlighted (red row), differing values flagged (amber). Values masked with toggle. **Client-side API** fetches variables for each selected environment
- `src/components/features/env-vault/DiffExportButton.tsx` — `"use client"`. Export diff as markdown or CSV. Generates content client-side from the diff data

**Consumes:** `GET /projects/:id/env-variables?environment=X` (multiple calls for each environment)

### Onboarding Checklist — US-09 (~2 files)

- `src/components/features/env-vault/OnboardingChecklist.tsx` — `"use client"`. Shows required variables for a project with names, descriptions, expected format. Per-user completion tracking (checkbox state). Download .env.example button
- `src/components/features/env-vault/EnvExampleButton.tsx` — `"use client"`. Calls `GET /projects/:id/env-variables/example` and triggers download

**Consumes:** `GET /projects/:id/env-variables` (filter `isRequired=true`), `GET .../example`

---

## Phase 6: Secret Files (~5 files)

- `src/components/features/secret-files/SecretFilesTab.tsx` — `"use client"`. Environment filter + file DataGrid + upload button. **Client-side API** for listing
- `src/components/features/secret-files/UploadSecretFileDialog.tsx` — `"use client"`. FileDropZone + environment + description. **Client-side API** for multipart upload (needs upload progress)
- `src/components/features/secret-files/EditSecretFileDialog.tsx` — `"use client"`. TanStack Form: name, description, environment. Server action
- `src/components/features/secret-files/VersionHistoryDialog.tsx` — `"use client"`. Version list with rollback buttons. **Client-side API** for versions, server action for rollback
- `src/components/features/secret-files/FileDropZone.tsx` — `"use client"`. HTML5 drag-and-drop zone styled with MUI Paper, dashed border
- `src/actions/secret-file.ts` — Server actions: `updateSecretFileAction`, `deleteSecretFileAction`, `rollbackSecretFileAction`

**Consumes:** `POST/GET/PUT/DELETE /projects/:id/secrets`, `GET .../download`, `GET .../versions`, `POST .../rollback`

---

## Phase 6b: Secret Sharing Creation — US-07 (~2 files)

- `src/components/features/secret-sharing/CreateShareLinkDialog.tsx` — `"use client"`. TanStack Form dialog: select variables/files to share, set expiration (1h, 24h, 7d, custom), optional password. On submit generates one-time link. Shows link with CopyButton and expiration info
- `src/components/features/secret-sharing/ShareLinkStatus.tsx` — `"use client"`. Shows share link status in audit log context: pending, viewed, expired

**Consumes:** Secret sharing creation endpoint (to be added to backend as needed)

---

## Phase 7: Members & Audit Log (~4 files)

### Members

- `src/components/features/members/MembersTab.tsx` — `"use client"`. Member DataGrid: avatar, username, email, role chip, actions. Invite button (owner only). **Client-side API** for listing, server actions for mutations
- `src/components/features/members/InviteMemberDialog.tsx` — `"use client"`. TanStack Form: email + role selector. Server action
- `src/actions/member.ts` — Server actions: `inviteMemberAction`, `updateMemberRoleAction`, `removeMemberAction`, `transferOwnershipAction`

**Consumes:** `GET/POST/PUT/DELETE /projects/:id/members`, `POST /projects/:id/transfer`

### Audit Log

- `src/components/features/audit-log/AuditLogTab.tsx` — `"use client"`. Filterable DataGrid: action chip, resource type, user, IP, timestamp. Action + resource type filter dropdowns. **Client-side API** with pagination
- `src/actions/` — No server actions needed (read-only)

**Consumes:** `GET /projects/:id/audit-log`

---

## Phase 8: User Profile (~6 files)

- `src/app/(dashboard)/profile/page.tsx` — Server component with `use cache`: fetches user, renders ProfileView
- `src/components/features/profile/ProfileView.tsx` — Stacked card sections
- `src/components/features/profile/ProfileInfoForm.tsx` — `"use client"`. TanStack Form: username, avatar. Server action
- `src/components/features/profile/ChangePasswordForm.tsx` — `"use client"`. TanStack Form: current + new + confirm password. Server action
- `src/components/features/profile/ChangeEmailForm.tsx` — `"use client"`. TanStack Form: new email + current password. Server action
- `src/components/features/profile/DeleteAccountSection.tsx` — `"use client"`. Red danger zone, confirm dialog with username typing. Server action
- `src/actions/user.ts` — Server actions: `updateProfileAction`, `changePasswordAction`, `changeEmailAction`, `deleteAccountAction`

**Consumes:** `GET/PATCH /users/me`, `PATCH /users/me/password`, `PATCH /users/me/email`, `DELETE /users/me`

---

## Phase 9: Format Converter (~2 files)

- `src/app/(dashboard)/converter/page.tsx` — Server component
- `src/components/features/converter/ConverterView.tsx` — `"use client"`. Split-pane: left (from format selector + input textarea), right (to format selector + read-only output). Convert button. **Client-side API** for conversion (instant feedback). Entry count, copy/download on output

**Consumes:** `POST /convert` (client API for instant feedback)

---

## Phase 10: Landing Page & Public Routes (~4 files)

- `src/app/page.tsx` — Server component. Hero section + feature cards + CTA buttons
- `src/components/features/landing/HeroSection.tsx` — Gradient heading, subtitle, Get Started + Sign In buttons
- `src/components/features/landing/FeatureCards.tsx` — 3 MUI Cards: Dependency Analysis, Env Vault, Secret Sharing
- `src/app/secrets/[token]/page.tsx` — `"use client"`. Public one-time secret access page. Client-side API call (no auth)

**Consumes:** `GET /secrets/:token`

---

## Phase 11: Error Handling & Polish (~5 files)

- `src/app/not-found.tsx` — Custom 404 page with DepVault branding
- `src/app/error.tsx` — `"use client"`. Global error boundary with retry button
- `src/app/(dashboard)/loading.tsx` — Dashboard skeleton loader
- `src/app/(auth)/loading.tsx` — Auth loading spinner

---

## Data Fetching Strategy Summary

| Context                                            | Method                                            | Why                                              |
| -------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------ |
| Initial page data (projects, user, project detail) | Server component + `use cache`                    | Fast first paint, cached, SEO                    |
| Form submissions (create, update, delete)          | Server actions (`"use server"`)                   | Secure, no token in client, auto-revalidate      |
| DataGrid sort/filter/paginate                      | TanStack Query `useQuery` + Eden Treaty           | Cached, auto-refetch, instant interactions       |
| Search/autocomplete                                | TanStack Query with debounced queryKey            | Deduplication, caching, real-time feedback       |
| File uploads                                       | TanStack Query `useMutation` + FormData           | Upload progress, error retry, cache invalidation |
| Masked value toggle                                | Client state only                                 | No network call needed                           |
| Post-mutation refresh                              | `useMutation` → `onSuccess` → `invalidateQueries` | Automatic cache sync after server actions        |

---

## Dependency Graph

```text
Phase 0 (deps)
  → Phase 1 (foundation + backend cookie auth)
     → Phase 2 (auth)
     → Phase 10 (landing)
     → Phase 3 (dashboard/projects)
        → Phase 4 (analysis)           \
        → Phase 4b (dependency tree)    |
        → Phase 5 (env vault + diff    |  All independent,
              + onboarding checklist)   |  can be parallelized
        → Phase 6 (secret files)        |
        → Phase 6b (secret sharing)     |
        → Phase 7 (members/audit)       |
     → Phase 8 (profile)              /
     → Phase 9 (converter)           /
  → Phase 11 (polish) — parallel with phases 3-10
```

---

## Key Architecture Decisions

1. **Hybrid SSR** — Server components + `use cache` for initial data, server actions for mutations, TanStack Query for interactive client-side data
2. **TanStack ecosystem** — TanStack Form + Zod for forms (server action support), TanStack Query for client-side caching/fetching
3. **Dual API clients** — `api-server.ts` (SSR with cookies) and `api.ts` (client with token), both Eden Treaty
4. **Server actions folder** — `src/actions/` with one file per domain (auth, project, analysis, etc.)
5. **Tab routing via query params** — Project detail tabs use `?tab=analysis`, simple and bookmarkable
6. **ProjectProvider** — Context wrapping project detail, provides data + role to all tabs
7. **Dual cache invalidation** — Server actions call `revalidateTag()` for SSR cache; TanStack Query `invalidateQueries()` for client cache

---

## Critical Files to Reference

- `packages/shared/src/api/index.ts` — Eden Treaty client factory (reuse)
- `apps/frontend/src/app/layout.tsx` — Extend with NotificationProvider
- `apps/frontend/src/theme/theme.ts` — Add DataGrid component overrides
- `apps/frontend/src/i18n/request.ts` — Locale handling pattern
- `apps/backend/src/app.ts` — Backend App type export for type safety

---

## Verification Plan

1. `cd apps/frontend && bun run dev` — pages render without errors
2. Auth flow: Register → verify email → login → dashboard redirect (cookies set correctly)
3. Project CRUD: Create → list → detail → edit → delete
4. Analysis: Upload package.json → see dependencies table → expand vulnerabilities
5. Dependency tree: View interactive graph → click node → see detail panel → search
6. Env vault: Create variable → masked value → reveal → import/export
7. Env diff: Select 2 environments → see side-by-side → highlight missing vars
8. Onboarding: See required variables checklist → download .env.example
9. Secret files: Upload → list → versions → rollback
10. Secret sharing: Generate one-time link → copy → access → verify one-time destruction
11. Members: Invite → change role → remove
12. Profile: Update username → change password
13. Converter: Paste .env → convert to JSON → copy
14. Theme: Toggle dark/light across all pages
15. Responsive: Sidebar collapses on mobile
16. `bun run typecheck` — no errors

## Additional Notes

- **`@depvault/shared`** must be added explicitly to `apps/frontend/package.json` as a workspace dependency
- **`IntlMessages` type augmentation** needed in `global.d.ts` for type-safe `useTranslations()`
- Analysis upload uses raw text content (`content: string`), not file upload — the textarea approach is correct
