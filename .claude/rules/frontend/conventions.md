---
description: Frontend code conventions and patterns
paths: [apps/frontend/src/**]
---

# Frontend Conventions

## Folder Structure

```text
src/
├── app/                 # Next.js App Router pages
│   ├── (auth)/          # Auth pages (login, register, reset-password)
│   ├── (dashboard)/     # Authenticated pages (projects, analysis, vault)
│   └── layout.tsx       # Root layout with theme provider
├── components/
│   ├── ui/              # Generic components (buttons, modals, forms)
│   └── features/        # Feature-specific components
│       └── vault/       # Vault setup, unlock, recovery dialogs
├── hooks/               # Custom React hooks (use-auth, use-vault, use-api-query)
├── lib/                 # API client, utils, constants
│   └── crypto.ts        # WebCrypto E2E encryption module
├── providers/           # React context providers (auth, theme, vault)
└── types/               # Frontend-specific TypeScript types
```

## File Naming

- **Kebab-case** for all files: `app-shell.tsx`, `use-auth.ts`, `auth-card.tsx`
- No PascalCase filenames

## Exports

- **Named exports** for all components, hooks, providers: `export function Sidebar()`
- **Default exports** only for Next.js pages and layouts (`page.tsx`, `layout.tsx`)

## Server Components by Default

- **Never** add `"use client"` to `page.tsx` or `layout.tsx` files
- Extract interactive logic into `"use client"` feature components under `src/components/features/`

## Component Props

Destructure props inside the function body, not in parameters:

```typescript
// CORRECT
function Sidebar(props: SidebarProps): ReactElement {
  const { open, onToggle } = props;
}
```

## MUI Imports

Use consolidated barrel imports, never deep imports:

```typescript
import { Alert, Button, TextField } from "@mui/material";
```

## Path Aliases

tsconfig uses `"@/*": ["./src/*"]`. Imports use `@/` without `src/`.

## Forms

Use TanStack Form with Zod v4 validators:

```typescript
import { z } from "zod/v4";

const form = useForm({
  defaultValues: { email: "", password: "" },
  validators: { onSubmit: loginSchema },
  onSubmit: async ({ value }) => { ... },
});
```

Use `FormTextField` and other reusable form components from `components/ui/form/`.

## React 19

- Use `use()` hook for async data in client components instead of `useEffect` + `useState` pattern
- **Never** use `useCallback`, `useMemo`, or `memo` — the React 19 compiler handles memoization
- **Never** call `setState` synchronously inside a `useEffect` body — derive state from existing values, or call `setState` only inside async callbacks (`.then()`, event handlers)

## Encryption in Components

- Components that read/write encrypted data must call `useVault()` to get `getProjectDEK(projectId)`
- Encrypt before API calls: `const encrypted = await encrypt(value, dek)` → send `{encryptedValue, iv, authTag}`
- Decrypt after fetching: `const plaintext = await decrypt(data.encryptedValue, data.iv, data.authTag, dek)`
- For async decrypt-on-load patterns, use `useEffect` with a cancellation flag — set state only in the `.then()` callback
- For share links, embed the ephemeral key in the URL fragment: `url + '#key=' + shareKeyToFragment(raw)`

## UI Components

- **Component library**: MUI 9 — prefer MUI components over custom HTML elements
- **Styling**: MUI `sx` prop for all styling. System props (e.g. `mt`, `alignItems`) are removed in v9 — always pass layout/spacing through `sx`. Custom CSS utility classes in `globals.css` for animations
- **Data tables**: Custom table components or MUI Table. MUI DataGrid for complex grids with sorting/filtering
- **Layout**: MUI Box, Stack, Grid (use `size={{ xs, sm, md }}`, not the v5-era `item` + `xs`/`sm` props). App shell uses persistent sidebar + top app bar
- **Typography**: MUI Typography with semantic variants (h1–h6, body1, body2, caption)

## Testing

- **Framework**: Vitest + React Testing Library
- **Unit tests**: Utility functions, custom hooks, crypto module (`lib/crypto.test.ts`)
- **Component tests**: User interactions and rendered output
- **Location**: Co-locate as `{component}.test.tsx`
