import { t, type Static } from "elysia";

export const EnvVariableVersionParamsSchema = t.Object({
  id: t.String(),
  varId: t.String(),
  versionId: t.String(),
});

export const EnvVariableVersionResponseSchema = t.Object({
  id: t.String(),
  variableId: t.String(),
  encryptedValue: t.String(),
  iv: t.String(),
  authTag: t.String(),
  changedByName: t.String(),
  createdAt: t.Date(),
});

export const EnvVariableVersionListResponseSchema = t.Object({
  items: t.Array(EnvVariableVersionResponseSchema),
});

export type EnvVariableVersionResponse = Static<typeof EnvVariableVersionResponseSchema>;
export type EnvVariableVersionListResponse = Static<typeof EnvVariableVersionListResponseSchema>;
