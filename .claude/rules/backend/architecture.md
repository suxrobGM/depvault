---
paths:
  - "apps/backend/"
---

# Backend Architecture

## Folder Structure

```text
src/
├── app.ts              # Elysia bootstrap, plugin + controller registration
├── env.ts              # Environment config with TypeBox validation
├── common/
│   ├── di/             # tsyringe container — registers PrismaClient as instance
│   ├── errors/         # HttpError classes (400, 401, 403, 404, 409)
│   ├── middleware/      # auth guard, role guard, global error handler
│   ├── plugins/        # swagger + cors Elysia plugins
│   ├── utils/          # password, logger, date, billing, commission helpers
│   ├── services/       # connection manager
│   └── database/       # Prisma client singleton with pg adapter
├── modules/            # Feature modules (domain-driven)
├── jobs/               # Background/scheduled tasks
├── types/              # Shared Elysia schemas (pagination, request, response)
└── constants/
```

## DI Pattern

- Services: `@injectable()` class, constructor-injects `PrismaClient` (or a repository)
- Repositories: `@injectable()` class with pure Prisma queries
- Controllers: resolve service via `container.resolve(ServiceClass)`
- PrismaClient registered in `common/di/container.ts` via `container.registerInstance()`

## Auth

- **Auth guard**: Elysia `derive({ as: "scoped" })` — verifies JWT and injects typed `user` into context. Only applies to modules that `.use(authGuard)`.
- **Role guard**: chains auth guard and checks `user.role`. Usage: `.use(roleGuard("ADMIN"))`.

## Error Handling

Throw from services: `NotFoundError`, `BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `ConflictError`. Global error middleware maps them to HTTP responses.
