import { t, type Static } from "elysia";

export const EnvBundleBodySchema = t.Object({
  variableIds: t.Array(t.String(), { minItems: 0 }),
  secretFileIds: t.Array(t.String(), { minItems: 0 }),
});

const BundleVariableSchema = t.Object({
  key: t.String(),
  encryptedValue: t.String(),
  iv: t.String(),
  authTag: t.String(),
});

const BundleFileSchema = t.Object({
  id: t.String(),
  name: t.String(),
  encryptedContent: t.String(),
  iv: t.String(),
  authTag: t.String(),
  mimeType: t.String(),
});

export const EnvBundleResponseSchema = t.Object({
  variables: t.Array(BundleVariableSchema),
  files: t.Array(BundleFileSchema),
});

export type EnvBundleBody = Static<typeof EnvBundleBodySchema>;
export type EnvBundleResponse = Static<typeof EnvBundleResponseSchema>;
