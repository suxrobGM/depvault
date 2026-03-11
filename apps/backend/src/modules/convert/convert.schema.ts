import { CONFIG_FORMAT_VALUES } from "@shared/constants/config-formats";
import { t, type Static } from "elysia";

const ConfigFormatSchema = t.Union(CONFIG_FORMAT_VALUES.map((v) => t.Literal(v)));

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
