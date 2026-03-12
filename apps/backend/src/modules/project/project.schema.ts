import { t, type Static } from "elysia";
import { PaginationQueryBaseSchema } from "@/types/pagination";
import { PaginatedResponseSchema } from "@/types/response";

export const CreateProjectBodySchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 100 }),
  description: t.Optional(t.String({ maxLength: 500 })),
  repositoryUrl: t.Optional(t.String({ maxLength: 500 })),
});

export const UpdateProjectBodySchema = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
  description: t.Optional(t.String({ maxLength: 500 })),
  repositoryUrl: t.Optional(t.String({ maxLength: 500 })),
});

export const ProjectResponseSchema = t.Object({
  id: t.String(),
  name: t.String(),
  description: t.Nullable(t.String()),
  repositoryUrl: t.Nullable(t.String()),
  ownerId: t.String(),
  createdAt: t.Date(),
  updatedAt: t.Date(),
});

export const ProjectListQuerySchema = PaginationQueryBaseSchema;

export const ProjectListResponseSchema = PaginatedResponseSchema(ProjectResponseSchema);

export const ProjectStatsResponseSchema = t.Object({
  projectCount: t.Number(),
  dependencyCount: t.Number(),
  vulnerabilityCount: t.Number(),
  envVariableCount: t.Number(),
});

export type CreateProjectBody = Static<typeof CreateProjectBodySchema>;
export type UpdateProjectBody = Static<typeof UpdateProjectBodySchema>;
export type ProjectResponse = Static<typeof ProjectResponseSchema>;
export type ProjectListQuery = Static<typeof ProjectListQuerySchema>;
export type ProjectStatsResponse = Static<typeof ProjectStatsResponseSchema>;
