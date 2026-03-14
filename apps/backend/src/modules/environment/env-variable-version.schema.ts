import { t, type Static } from "elysia";
import { tDateTime } from "@/types/schema";

export const EnvVariableVersionParamsSchema = t.Object({
  id: t.String(),
  varId: t.String(),
  versionId: t.String(),
});

export const EnvVariableVersionResponseSchema = t.Object({
  id: t.String(),
  variableId: t.String(),
  value: t.String(),
  changedByName: t.String(),
  createdAt: tDateTime(),
});

export const EnvVariableVersionListResponseSchema = t.Object({
  items: t.Array(EnvVariableVersionResponseSchema),
});

export type EnvVariableVersionResponse = Static<typeof EnvVariableVersionResponseSchema>;
export type EnvVariableVersionListResponse = Static<typeof EnvVariableVersionListResponseSchema>;
