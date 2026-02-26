# General Rules

## Commands

```bash
# Backend (cd apps/backend)
bun run dev / start / typecheck
bun test
bun run db:generate / db:push / db:migrate / db:migrate:apply
bun run build:types

# Web (cd apps/web)
bun run dev / build / start

# Root
bun run typecheck   # all workspaces
```

## Comments

Don't add comments that restate what the code already says. Only comment to explain **why**, not **what**. If the code needs a comment to explain what it does, rename the variable or extract a function instead.

## File Size Guideline

Aim for ~300–350 LOC per file as a soft ceiling. If a service or controller grows past this, look for extraction opportunities (repository, helper, or splitting the module). Schema and repository files are naturally shorter.
