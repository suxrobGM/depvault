---
description: Backend conventions for Elysia.js API development
paths: [apps/backend/src/**]
---

# Backend Conventions

## Folder Structure

```text
src/
├── app.ts              # Elysia bootstrap, plugin + controller registration
├── env.ts              # Environment config with TypeBox validation
├── common/
│   ├── di/             # tsyringe container
│   ├── errors/         # HttpError classes (400, 401, 403, 404, 409)
│   ├── middleware/      # auth guard, role guard, project guard, error handler
│   ├── plugins/        # swagger + cors Elysia plugins
│   ├── utils/          # password, logger, date, billing helpers
│   ├── services/       # connection manager
│   └── database/       # Prisma client singleton with pg adapter
├── modules/            # Feature modules (domain-driven)
│   └── vault/          # E2E encryption key management
├── jobs/               # Background/scheduled tasks
├── types/              # Shared Elysia schemas (pagination, request, response)
└── constants/
```

## Module Pattern

- 3-file core: `controller.ts`, `service.ts`, `schema.ts`
- Optional: `repository.ts` (complex queries), `mapper.ts` (response mapping), `ws.ts` (WebSocket)
- Every module exports an Elysia plugin, registered in `src/app.ts`

## DI Pattern

- Services: `@singleton()` or `@injectable()` class, constructor-injects `PrismaClient`
- Repositories: `@singleton()` class with pure Prisma queries
- Controllers: resolve service via `container.resolve(ServiceClass)`

## Error Handling

- Throw from services: `NotFoundError`, `BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `ConflictError`
- Never throw raw `Error` — use typed HTTP errors from `common/errors/`

## Auth & Guards

- Auth guard: `.use(authGuard)` — verifies JWT, injects `user`
- Role guard: `.use(roleGuard("ADMIN"))` — checks system role
- Project guard: `.use(projectGuard("VIEWER"))` — verifies membership + minimum project role, injects `projectMember`
- Public endpoints: only `/auth/register`, `/auth/login`, `/auth/github`, `/auth/github/callback`

## Schemas

- Use TypeBox (`t.*`) for all request/response validation
- Group type aliases at end of schema file
- All return types from service methods must be declared in `.schema.ts` — no inline object types

## Testing

- **Framework**: Bun's built-in test runner (`bun test`)
- **Unit tests**: Service methods with mocked PrismaClient
- **Integration tests**: API endpoints using Elysia's `.handle()` method
- **Location**: Co-locate as `{module}.service.test.ts`, `{module}.controller.test.ts`
- **Naming**: `describe("ServiceName")` → `describe("methodName")` → `it("should ...")`
