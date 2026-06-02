---
description: Rules for Eden Treaty type aliases and API type inference
paths: [apps/frontend/src/types/api/**]
---

# Eden Treaty Type Aliases

## Dot notation

Use dot notation, not bracket notation. Alias the endpoint, then derive:

```typescript
type Projects = typeof client.api.projects;
type ProjectById = ReturnType<Projects>; // unwrap parameterized (:id) routes
```

Chain `ReturnType` for nested params: `ReturnType<ProjectById["analyses"]>`.

## Utility types (`./utils`)

```typescript
import type { Body, Data, Query } from "./utils";

export type ProjectDetailDto = Data<ProjectById["get"]>; // response data
export type CreateCiTokenBody = Body<ProjectById["ci-tokens"]["post"]>; // request body
export type ActivityQueryDto = Query<typeof client.api.activity.get>; // query params
```

Use `Body<T>`, never `Parameters<T>[0]`.

Never hand-write an interface that mirrors a request or response payload (e.g. a local
`EncryptedAccessResult` duplicating an endpoint's JSON). Derive it with `Data`/`Body`/`Query`
so it tracks the backend automatically. `useApiMutation`/`useApiQuery` already infer the
response type from the Treaty call, so `onSuccess` data and `mutateAsync` return values are
typed — no casts. Local view models that hold _post-processing_ state (e.g. decrypted
plaintext that never crosses the wire) are fine; flag them as such.

## Naming

`Dto` suffix on responses/items (`ProjectDto`, `ProjectDetailDto`, `XListResponseDto`,
`XDto = XListResponseDto["items"][number]`). Keep `CreateXBody`/`UpdateXBody` and enum extracts
(`AuditAction`, `NotificationType`) without the suffix.

## Query keys

Never hardcode key arrays — use the `@/lib/query-keys` factory:

```typescript
useApiQuery(queryKeys.projects.detail(projectId), () =>
  client.api.projects({ id: projectId }).get(),
);
```

Factories return `as const` tuples with a stable root token, so prefix invalidation works.
