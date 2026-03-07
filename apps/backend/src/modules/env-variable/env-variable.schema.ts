import { t, type Static } from "elysia";

export const EnvironmentTypeSchema = t.Union([
  t.Literal("DEVELOPMENT"),
  t.Literal("STAGING"),
  t.Literal("PRODUCTION"),
  t.Literal("CUSTOM"),
]);

export const CreateEnvVariableBodySchema = t.Object({
  environment: t.String({ minLength: 1, maxLength: 100 }),
  environmentType: t.Optional(EnvironmentTypeSchema),
  key: t.String({ minLength: 1, maxLength: 255 }),
  value: t.String(),
  description: t.Optional(t.String({ maxLength: 500 })),
  isRequired: t.Optional(t.Boolean()),
  validationRule: t.Optional(t.String({ maxLength: 255 })),
});

export const UpdateEnvVariableBodySchema = t.Object({
  key: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
  value: t.Optional(t.String()),
  description: t.Optional(t.String({ maxLength: 500 })),
  isRequired: t.Optional(t.Boolean()),
  validationRule: t.Optional(t.String({ maxLength: 255 })),
});

export const EnvVariableResponseSchema = t.Object({
  id: t.String(),
  environmentId: t.String(),
  key: t.String(),
  description: t.Nullable(t.String()),
  isRequired: t.Boolean(),
  validationRule: t.Nullable(t.String()),
  createdAt: t.Date(),
  updatedAt: t.Date(),
});

export const EnvVariableWithValueResponseSchema = t.Object({
  id: t.String(),
  environmentId: t.String(),
  key: t.String(),
  value: t.String(),
  description: t.Nullable(t.String()),
  isRequired: t.Boolean(),
  validationRule: t.Nullable(t.String()),
  createdAt: t.Date(),
  updatedAt: t.Date(),
});

export const EnvVariableListQuerySchema = t.Object({
  environment: t.Optional(t.String()),
  page: t.Integer({ minimum: 1, default: 1 }),
  limit: t.Integer({ minimum: 1, maximum: 100, default: 20 }),
});

export const EnvVariableListResponseSchema = t.Object({
  items: t.Array(EnvVariableWithValueResponseSchema),
  pagination: t.Object({
    page: t.Number(),
    limit: t.Number(),
    total: t.Number(),
    totalPages: t.Number(),
  }),
});

export const EnvVariableParamsSchema = t.Object({
  id: t.String(),
  varId: t.String(),
});

export type CreateEnvVariableBody = Static<typeof CreateEnvVariableBodySchema>;
export type UpdateEnvVariableBody = Static<typeof UpdateEnvVariableBodySchema>;
export type EnvVariableResponse = Static<typeof EnvVariableResponseSchema>;
export type EnvVariableWithValueResponse = Static<typeof EnvVariableWithValueResponseSchema>;
export type EnvVariableListQuery = Static<typeof EnvVariableListQuerySchema>;
