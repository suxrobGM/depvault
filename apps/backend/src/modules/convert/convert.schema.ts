import { CONFIG_FORMAT_VALUES } from "@depvault/shared/constants";
import { t, type Static } from "elysia";
import { tStringUnion } from "@/types/schema";

const ConfigFormatSchema = tStringUnion(CONFIG_FORMAT_VALUES);

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
