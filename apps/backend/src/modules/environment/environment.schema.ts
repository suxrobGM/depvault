import { t, type Static } from "elysia";
import { EnvironmentType } from "@/generated/prisma";

export const EnvironmentTypeSchema = t.Enum(EnvironmentType);

export const EnvironmentResponseSchema = t.Object({
  id: t.String(),
  type: EnvironmentTypeSchema,
  vaultGroupId: t.String(),
  vaultGroupName: t.String(),
  variableCount: t.Number(),
  secretFileCount: t.Number(),
  createdAt: t.Date(),
});

export const EnvironmentListQuerySchema = t.Object({
  vaultGroupId: t.Optional(t.String()),
});

export const EnvironmentListResponseSchema = t.Array(EnvironmentResponseSchema);

export const DeleteEnvironmentParamsSchema = t.Object({
  id: t.String(),
  envId: t.String(),
});

export type EnvironmentResponse = Static<typeof EnvironmentResponseSchema>;
