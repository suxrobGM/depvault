import { z } from "zod/v4";

/** Optional commit message attached to a saved config-file revision. */
export const saveConfigFileSchema = z.object({
  message: z.string().max(200, "Message must be 200 characters or fewer"),
});

export type SaveConfigFileValues = z.infer<typeof saveConfigFileSchema>;
