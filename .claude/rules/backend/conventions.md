---
description: Backend conventions for Elysia.js API development
paths: [apps/backend/src/**]
---

# Backend Conventions

## Module Pattern

- 3-file core: controller.ts, service.ts, schema.ts
- Optional: repository.ts (complex queries), mapper.ts (response mapping), ws.ts (WebSocket)
- Services use `@singleton()` decorator with constructor-injected PrismaClient
- Controllers resolve services via `container.resolve()`

## Error Handling

- Throw from services: NotFoundError, BadRequestError, UnauthorizedError, ForbiddenError, ConflictError
- Never throw raw Error — use typed HTTP errors from `common/errors/`
- Global error middleware maps them to consistent JSON responses

## Auth

- Auth guard: Elysia `derive({ as: "scoped" })` — apply with `.use(authGuard)`
- Role guard: `.use(roleGuard("ADMIN"))`
- Public endpoints: only `/auth/register`, `/auth/login`, `/auth/github`, `/auth/github/callback`

## Schemas

- Use TypeBox (`t.*`) for all request/response validation
- Group type aliases at end of schema file

## Registration

- Every module exports an Elysia plugin, registered in `src/app.ts`
