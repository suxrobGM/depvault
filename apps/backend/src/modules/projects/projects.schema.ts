import { t, type Static } from "elysia";

export const CreateProjectBodySchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 100 }),
  description: t.Optional(t.String({ maxLength: 500 })),
});

export const UpdateProjectBodySchema = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
  description: t.Optional(t.String({ maxLength: 500 })),
});

export const ProjectResponseSchema = t.Object({
  id: t.String(),
  name: t.String(),
  description: t.Nullable(t.String()),
  ownerId: t.String(),
  createdAt: t.Date(),
  updatedAt: t.Date(),
});

export const ProjectListQuerySchema = t.Object({
  page: t.Integer({ minimum: 1, default: 1 }),
  limit: t.Integer({ minimum: 1, maximum: 100, default: 20 }),
});

export const ProjectListResponseSchema = t.Object({
  items: t.Array(ProjectResponseSchema),
  pagination: t.Object({
    page: t.Number(),
    limit: t.Number(),
    total: t.Number(),
    totalPages: t.Number(),
  }),
});

export type CreateProjectBody = Static<typeof CreateProjectBodySchema>;
export type UpdateProjectBody = Static<typeof UpdateProjectBodySchema>;
export type ProjectResponse = Static<typeof ProjectResponseSchema>;
export type ProjectListQuery = Static<typeof ProjectListQuerySchema>;
