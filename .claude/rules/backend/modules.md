---
paths:
  - "apps/backend/"
---

## File Pattern

Each module uses a 3-file core with optional extras:

- `{module}.controller.ts` — Elysia route group (thin HTTP layer), resolves service via `container.resolve()`
- `{module}.service.ts` — `@injectable()` class with business logic, injects `PrismaClient` for simple queries
- `{module}.schema.ts` — Elysia `t.*` (TypeBox) request/response schemas, type aliases grouped at end of file

### Optional Files

- `{module}.repository.ts` — Only when the module has dynamic WHERE clauses, raw SQL, or multi-table upserts. Skip for simple `findUnique`/`create`/`update`/`delete`.
- `{module}.mapper.ts` — Pure exported functions (not class methods) that convert Prisma models to API response shapes. Extract when the service has 3+ mapping functions. Handle `Decimal` → `Number` and nested relation flattening.
- `{module}.ws.ts` — WebSocket handlers (currently only `messages/` module).

## Registration

Every module exports an Elysia plugin. Register it in `src/app.ts`:

```ts
import { ordersController } from "./modules/orders";

app.use(ordersController);
```

## File Size

~300-350 LOC soft ceiling per file. When exceeded, extract a repository, mapper, or split the module.
