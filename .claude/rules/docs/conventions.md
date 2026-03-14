---
description: Documentation site conventions for Nextra-based docs
paths: [apps/docs/**]
---

# Docs Conventions

## Framework

- Nextra 4 with nextra-theme-docs
- MDX for content pages, TSX for interactive pages (e.g., API reference)
- Turbopack requires `resolveAlias` for `next-mdx-import-source-file` in next.config.ts

## Structure

- Pages under `src/app/` following Next.js App Router conventions
- `_meta.ts` files control sidebar ordering and titles (keys = folder names)
- Guides in `guides/`, API docs in `api/`, CLI docs in `cli/`

## Theme

- Dark mode matching DepVault palette (emerald primary `#10b981`)
- CSS overrides in `global.css`
- No auth required — docs are public

## Content Guidelines

- Write for both developers and end users
- Include code examples for CLI and API usage
- Keep pages focused — one feature per page
- Use standard Markdown/MDX — no custom React components in content pages
