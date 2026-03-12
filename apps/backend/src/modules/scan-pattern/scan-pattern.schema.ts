import { t, type Static } from "elysia";
import { DetectionSeverity } from "@/generated/prisma";

const SeverityEnum = t.Enum(DetectionSeverity);

export const PatternProjectParamsSchema = t.Object({
  id: t.String({ format: "uuid" }),
});

export const PatternParamsSchema = t.Object({
  id: t.String({ format: "uuid" }),
  patternId: t.String({ format: "uuid" }),
});

export const CreatePatternBodySchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 255 }),
  regex: t.String({ minLength: 1, maxLength: 1024 }),
  severity: SeverityEnum,
});

export const UpdatePatternBodySchema = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
  regex: t.Optional(t.String({ minLength: 1, maxLength: 1024 })),
  severity: t.Optional(SeverityEnum),
});

export const PatternResponseSchema = t.Object({
  id: t.String(),
  projectId: t.Nullable(t.String()),
  name: t.String(),
  regex: t.String(),
  severity: SeverityEnum,
  isBuiltIn: t.Boolean(),
  createdAt: t.Date(),
});

export const PatternListResponseSchema = t.Object({
  items: t.Array(PatternResponseSchema),
});

export type CreatePatternBody = Static<typeof CreatePatternBodySchema>;
export type UpdatePatternBody = Static<typeof UpdatePatternBodySchema>;
export type PatternResponse = Static<typeof PatternResponseSchema>;
