---
description: Frontend code conventions and patterns
paths: [apps/frontend/src/**]
---

# Frontend Conventions

## File Naming

- **Kebab-case** for all files: `app-shell.tsx`, `use-auth.ts`, `auth-card.tsx`
- No PascalCase filenames

## Exports

- **Named exports** for all components, hooks, providers: `export function Sidebar()`
- **Default exports** only for Next.js pages and layouts (`page.tsx`, `layout.tsx`)

## Server Components by Default

- **Never** add `"use client"` to `page.tsx` or `layout.tsx` files. Pages and layouts must be React Server Components
- Extract interactive logic (hooks, state, event handlers) into `"use client"` feature components under `src/components/features/`
- Page files are thin wrappers that compose server-fetched data with client components

## Component Props

Destructure props inside the function body, not in parameters:

```typescript
// CORRECT
function Sidebar(props: SidebarProps): ReactElement {
  const { open, onToggle } = props;
}

// WRONG
function Sidebar({ open, onToggle }: SidebarProps): ReactElement {}
```

## MUI Imports

Use consolidated barrel imports, never deep imports:

```typescript
// CORRECT
import { Alert, Button, TextField } from "@mui/material";
// WRONG
import Alert from "@mui/material/Alert";
```

## Path Aliases

tsconfig uses `"@/*": ["./src/*"]`. Imports use `@/` without `src/`:

```typescript
import { useAuth } from "@/hooks/use-auth";
import { client } from "@/lib/api";
```

## Zod v4

Import from `zod/v4`:

```typescript
import { z } from "zod/v4";
```

## Forms

Use TanStack Form with Zod validators:

```typescript
const form = useForm({
  defaultValues: { email: "", password: "" },
  validators: { onSubmit: loginSchema },
  onSubmit: async ({ value }) => { ... },
});
```

## React 19

Use `use()` hook for async data in client components instead of `useEffect` + `useState` pattern. This avoids React compiler `set-state-in-effect` warnings.
