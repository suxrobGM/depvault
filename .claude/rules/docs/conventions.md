---
description: Documentation site conventions for Nextra-based docs
paths: [apps/docs/**]
---

# Docs Conventions

## Framework

- Nextra 4 with nextra-theme-docs
- MDX for content pages
- Turbopack requires `resolveAlias` for `next-mdx-import-source-file` in next.config.ts

## Structure

- Pages under `src/app/` following Next.js App Router conventions
- `_meta.ts` files control sidebar ordering and titles (keys = folder names)
- Guides in `guides/`, CLI reference in `cli/`
- CLI feature commands (env, analyze, convert, ci) are documented inline in their corresponding guide pages, not in the CLI section

## Theme

- Dark mode matching DepVault palette (emerald primary `#10b981`)
- CSS overrides in `global.css`
- No auth required — docs are public

## Content Guidelines

- Write concise, professional prose — lead with substance, not restatements
- No "Overview" sections that repeat the page heading
- No "What's Next" / "Next Steps" sections — the sidebar handles navigation
- No "Best Practices" sections unless advice is specific and non-obvious
- E2E encryption details belong on the Encryption & Security guide (`/guides/encryption`) — other pages link to it and say "end-to-end encrypted"
- Step-by-step UI instructions: 3–4 steps max
- Include CLI examples with flags tables for relevant features
- Keep pages focused — one feature per page
- Use standard Markdown/MDX — no custom React components in content pages
