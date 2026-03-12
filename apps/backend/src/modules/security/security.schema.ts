import { t, type Static } from "elysia";

export const SecurityOverviewResponseSchema = t.Object({
  vulnerabilities: t.Object({
    critical: t.Number(),
    high: t.Number(),
    medium: t.Number(),
    low: t.Number(),
    none: t.Number(),
    total: t.Number(),
  }),
  secretScans: t.Object({
    totalScans: t.Number(),
    openDetections: t.Number(),
    resolvedDetections: t.Number(),
  }),
  projectCount: t.Number(),
});

export type SecurityOverviewResponse = Static<typeof SecurityOverviewResponseSchema>;
