import { z } from "zod/v4";

export const CONFIG_FORMATS = [
  { value: "env", label: ".env" },
  { value: "appsettings.json", label: "appsettings.json" },
  { value: "secrets.yaml", label: "secrets.yaml" },
  { value: "config.toml", label: "config.toml" },
] as const;

const configFormatValues = ["env", "appsettings.json", "secrets.yaml", "config.toml"] as const;
export type ConfigFormat = (typeof configFormatValues)[number];

export const converterSchema = z
  .object({
    content: z.string().min(1, "Content is required"),
    fromFormat: z.enum(configFormatValues),
    toFormat: z.enum(configFormatValues),
  })
  .refine((data) => data.fromFormat !== data.toFormat, {
    message: "Source and target formats must be different",
    path: ["toFormat"],
  });
