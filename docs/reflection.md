# Reflection: Context engineering for AI-assisted development

DepVault is a dependency analysis and env variable management dashboard. I started this assignment with PRD, a partial CLAUDE.md, and no actual code. I setup a Scrum board with AI and tested the first issue with or without CLAUDE.md rules to see the difference.

## What I added to CLAUDE.md

The original file (~139 lines) had good backend architecture docs but nothing about the frontend, nothing about Git workflow, and no explicit "don't do this" rules. I added five sections:

PRD & design references -- user flow descriptions (registration, analysis, env vault, secret sharing) and UI component guidelines (which MUI components to use, how to handle forms, layout patterns). Without this, the AI writes code that works but doesn't look or behave like the app I'm building.

Frontend architecture -- folder structure for the Next.js app, Server Components by default, centralized API client. There was zero frontend guidance before, so the AI would just guess.

Scrum & workflow -- branch naming (`feat/<issue>-<description>`), Conventional Commits, PR workflow with issue references. This doesn't change the code itself, but it means the AI creates proper branches and commit messages instead of pushing straight to main.

Do's and Don'ts -- the "Don't" list was surprisingly useful. Things like "don't use `any`", "don't use `console.log`", "don't commit `.env` files" catch mistakes the AI makes by default. I also added security rules (auth guard requirements, rate limiting, no logging decrypted values).

Testing strategy -- which test runners to use (Bun for backend, Vitest for frontend), where to put test files, coverage targets. Without this the AI either skips tests or picks the wrong framework.

The final file is around 300 lines. Long enough to be useful, short enough that it fits in the AI's context window.

## Before/after results

I tested with the database schema (User, Project, Member, Analysis, Dependency, Vulnerability models). Same prompt both times.

Without rules: the AI gave me auto-increment integer IDs, a single `schema.prisma` file, string literals for roles and statuses, missing `updatedAt` on 4 of 6 models, no soft deletes, no pg adapter, and a field called `password` instead of `passwordHash`. It worked, but I'd have to rewrite most of it.

With rules: UUID primary keys, multi-file schema in `prisma/schema/`, proper Prisma enums, timestamps on every model, `deletedAt` on User, cascade deletes, `driverAdapters` preview feature configured. I could use it as-is.

I tracked convention compliance across 12 criteria (UUID PKs, timestamps, soft deletes, multi-file schema, enums, etc.). Without rules: 3 out of 12. With rules: 12 out of 12. In practice, the "before" schema would have taken me an hour to fix. The "after" one I could use directly.

## How the Scrum board helped

I broke the PRD into 23 issues across two sprints. A few things that worked well:

Small issues keep the AI focused. The PRD has broad categories like "Authentication & User Management" -- too much for one AI session. Splitting auth into three issues (registration, login/reset, OAuth) means each conversation stays on track.

Acceptance criteria double as specs. When I say "implement Issue #8," the AI gets a checklist of exactly what the endpoint should do. No ambiguity.

Priority ordering prevents wasted work. P0 issues (scaffolding, schema, auth) have to be done before P1 issues (parsers, dashboard). The board makes this dependency chain visible.

## What I learned

Specific rules work, vague rules don't. "Use UUID for all primary keys" gets followed every time. "Use good ID types" would get interpreted differently in every session.

Telling the AI what NOT to do matters as much as telling it what to do. The AI has defaults from training data (auto-increment IDs, `console.log`, `any` types). Explicit "don't" rules override those defaults in a way that positive rules alone don't.

The rules file doubles as team documentation. A new developer reading CLAUDE.md would learn the same conventions the AI follows. You write it once and it works for both audiences.

## What I'd change for Sprint 2

I want to add short code examples to CLAUDE.md. Describing "how to create a new module" in prose is less effective than showing a 10-line snippet. I'd also define the exact API response envelope format (success/error/pagination) before building the env vault endpoints, since Sprint 2 has a lot of new API surface area. Some Sprint 2 issues (like #21, which combines import/export and format conversion) should probably be split further based on what I learned in Sprint 1.
