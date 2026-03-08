---
description: Rules for Eden Treaty type aliases and API type inference
paths: [apps/frontend/src/types/api/**]
---

# Eden Treaty Type Aliases

## Parameterized Routes

Eden Treaty represents parameterized route segments (`:id`, `:projectId`, etc.) as **callable functions**, not indexable properties. You cannot use bracket notation like `[":id"]`.

Use `ReturnType<>` to extract the sub-route type:

```typescript
// WRONG — will error with "Property ':id' does not exist"
(typeof client)["api"]["projects"][":id"]["get"];

// CORRECT — use ReturnType to unwrap the callable
type ProjectById = ReturnType<(typeof client)["api"]["projects"]>;
ProjectById["get"];
```

For nested parameterized routes, chain `ReturnType`:

```typescript
type AnalysesByProject = ReturnType<(typeof client)["api"]["analyses"]["project"]>;
type AnalysisById = ReturnType<AnalysesByProject>;
AnalysisById["get"];
```

## Data Utility Type

Use the `Data<T>` helper from `./utils` to extract response data:

```typescript
import type { Data } from "./utils";

export type ProjectResponse = Data<ProjectById["get"]>;
```

The `Data<T>` type wraps `Treaty.Data<T>` with `NonNullable`. Its generic constraint is `T extends (...args: any[]) => any`.

## Non-parameterized Routes

Routes without parameters can use direct bracket notation:

```typescript
export type ProjectListResponse = Data<(typeof client)["api"]["projects"]["get"]>;
```
