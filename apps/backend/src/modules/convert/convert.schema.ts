import { t, type Static } from "elysia";

const ConfigFormatSchema = t.Union([
  t.Literal("env"),
  t.Literal("appsettings.json"),
  t.Literal("secrets.yaml"),
  t.Literal("config.toml"),
]);

export const ConvertBodySchema = t.Object({
  content: t.String({ minLength: 1 }),
  fromFormat: ConfigFormatSchema,
  toFormat: ConfigFormatSchema,
});

export const ConvertResponseSchema = t.Object({
  content: t.String(),
  fromFormat: t.String(),
  toFormat: t.String(),
  entryCount: t.Number(),
});

export type ConvertBody = Static<typeof ConvertBodySchema>;
