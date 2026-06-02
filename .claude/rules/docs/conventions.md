---
description: Documentation site conventions for Nextra-based docs
paths: [apps/docs/**]
---

# Docs Conventions

## Framework & Structure

- Nextra 4 + nextra-theme-docs, MDX content pages. Turbopack needs `resolveAlias` for `next-mdx-import-source-file` in `next.config.ts`
- Pages under `src/app/` (App Router); `_meta.ts` controls sidebar order/titles (keys = folder names)
- Guides in `guides/`, CLI reference in `cli/`. CLI feature commands (env, secrets, analyze, ci) are documented inline in their guide pages, not the CLI section

## Theme

- Public (no auth). Dark mode, emerald primary `#10b981`; CSS overrides in `global.css`

## Content Guidelines

- Concise, professional prose — lead with substance
- No "Overview" (repeats heading), "What's Next"/"Next Steps" (sidebar handles nav), or "Best Practices" (unless specific and non-obvious)
- E2E encryption details live only on the Encryption & Security guide (`/guides/encryption`); other pages link to it and just say "end-to-end encrypted"
- Step-by-step UI instructions: 3–4 steps max; include CLI examples with flag tables
- One feature per page; standard Markdown/MDX only — no custom React components
