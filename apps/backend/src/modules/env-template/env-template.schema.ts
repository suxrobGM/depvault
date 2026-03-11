import { t, type Static } from "elysia";
import { EnvironmentType } from "@/generated/prisma";

export const CreateEnvTemplateBodySchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 100 }),
  description: t.Optional(t.String({ maxLength: 500 })),
  sourceEnvironment: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
  variables: t.Optional(
    t.Array(
      t.Object({
        key: t.String({ minLength: 1, maxLength: 255 }),
        description: t.Optional(t.String({ maxLength: 500 })),
        isRequired: t.Optional(t.Boolean()),
      }),
    ),
  ),
});

export const UpdateEnvTemplateBodySchema = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
  description: t.Optional(t.String({ maxLength: 500 })),
});

const EnvTemplateVariableSchema = t.Object({
  id: t.String(),
  key: t.String(),
  description: t.Nullable(t.String()),
  isRequired: t.Boolean(),
  sortOrder: t.Number(),
});

export const EnvTemplateResponseSchema = t.Object({
  id: t.String(),
  name: t.String(),
  description: t.Nullable(t.String()),
  variableCount: t.Number(),
  createdBy: t.String(),
  createdAt: t.Date(),
  updatedAt: t.Date(),
});

export const EnvTemplateDetailResponseSchema = t.Object({
  id: t.String(),
  name: t.String(),
  description: t.Nullable(t.String()),
  createdBy: t.String(),
  createdAt: t.Date(),
  updatedAt: t.Date(),
  variables: t.Array(EnvTemplateVariableSchema),
});

export const EnvTemplateListResponseSchema = t.Array(EnvTemplateResponseSchema);

export const ApplyTemplateBodySchema = t.Object({
  vaultGroupId: t.String(),
  environmentName: t.String({ minLength: 1, maxLength: 100 }),
  environmentType: t.Optional(t.Enum(EnvironmentType)),
});

export const ApplyTemplateResponseSchema = t.Object({
  environmentId: t.String(),
  environmentName: t.String(),
  variablesCreated: t.Number(),
});

export const TemplateParamsSchema = t.Object({
  id: t.String(),
  templateId: t.String(),
});

export type CreateEnvTemplateBody = Static<typeof CreateEnvTemplateBodySchema>;
export type UpdateEnvTemplateBody = Static<typeof UpdateEnvTemplateBodySchema>;
export type ApplyTemplateBody = Static<typeof ApplyTemplateBodySchema>;
