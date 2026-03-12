import { CONFIG_FORMAT_VALUES } from "@shared/constants/config-formats";
import { t, type Static } from "elysia";
import { EnvironmentTypeSchema } from "./environment.schema";

const ConfigFormatSchema = t.Union(CONFIG_FORMAT_VALUES.map((v) => t.Literal(v)));

export const EnvBundleBodySchema = t.Object({
  vaultGroupId: t.String(),
  environmentType: EnvironmentTypeSchema,
  variableIds: t.Array(t.String(), { minItems: 0 }),
  secretFileIds: t.Array(t.String(), { minItems: 0 }),
  format: ConfigFormatSchema,
});

export const EnvBundleResponseSchema = t.Object({
  data: t.String(),
  fileName: t.String(),
});

export type EnvBundleBody = Static<typeof EnvBundleBodySchema>;
