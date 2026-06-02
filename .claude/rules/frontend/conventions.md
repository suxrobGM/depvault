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

## Naming & Exports

- **Kebab-case** filenames only (`app-shell.tsx`, `use-auth.ts`) — no PascalCase
- **Named exports** for components/hooks/providers; **default exports** only for `page.tsx`/`layout.tsx`
- **Barrels**: each feature folder has an `index.ts`. Import across features via the folder path (`@/components/features/share-link`), not deep file paths. Siblings in the same folder import relatively (`./file-editor`)
- Path alias `"@/*": ["./src/*"]` — import with `@/`, never `src/`

## Server Components by Default

- **Never** add `"use client"` to `page.tsx` / `layout.tsx`
- Extract interactive logic into `"use client"` feature components under `src/components/features/`

## Component Props

Destructure inside the function body, not in parameters:

```typescript
function Sidebar(props: SidebarProps): ReactElement {
  const { open, onToggle } = props;
}
```

## React 19

- Use the `use()` hook for async data in client components, not `useEffect` + `useState`
- **Never** use `useCallback`/`useMemo`/`memo` — the compiler handles memoization
- **Never** call `setState` synchronously in a `useEffect` body — derive from existing values, or set state only in async callbacks (`.then()`, event handlers)

## Forms

TanStack Form with Zod v4 validators; use reusable components (`FormTextField`, etc.) from `components/ui/form/`:

```typescript
import { z } from "zod/v4";

const form = useForm({
  defaultValues: { email: "", password: "" },
  validators: { onSubmit: loginSchema },
  onSubmit: async ({ value }) => { ... },
});
```

## Encryption in Components

- Call `useVault()` to get `getProjectDEK(projectId)` for any read/write of encrypted data
- Encrypt before sending: `const enc = await encrypt(value, dek)` → `{encryptedValue, iv, authTag}`
- Decrypt after fetching: `await decrypt(data.encryptedValue, data.iv, data.authTag, dek)`
- Decrypt-on-load: `useEffect` with a cancellation flag; set state only in the `.then()` callback
- Share links: embed the ephemeral key in the URL fragment — `url + '#key=' + shareKeyToFragment(raw)`

## UI (MUI 9)

- Prefer MUI components over raw HTML; import from the barrel — `import { Button } from "@mui/material"`, never deep imports
- All styling via the `sx` prop — system props (`mt`, `alignItems`) are gone in v9. Animations via CSS utility classes in `globals.css`
- Layout with Box/Stack/Grid (`size={{ xs, sm, md }}`, not v5 `item` + `xs`). App shell = persistent sidebar + top app bar
- MUI Table / DataGrid (DataGrid for sort/filter grids); Typography with semantic variants

## Testing

- Vitest + React Testing Library; co-locate as `{component}.test.tsx`
- Test utils, hooks, crypto module (`lib/crypto.test.ts`), and component interactions/output
