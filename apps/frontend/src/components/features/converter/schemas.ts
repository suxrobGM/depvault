import { CONFIG_FORMAT_VALUES } from "@depvault/shared/constants";
import { z } from "zod/v4";

export { CONFIG_FORMATS, type ConfigFormat } from "@depvault/shared/constants";

export const converterSchema = z
  .object({
    content: z.string().min(1, "Content is required"),
    fromFormat: z.enum(CONFIG_FORMAT_VALUES),
    toFormat: z.enum(CONFIG_FORMAT_VALUES),
  })
  .refine((data) => data.fromFormat !== data.toFormat, {
    message: "Source and target formats must be different",
    path: ["toFormat"],
  });
