import { z } from "zod/v4";

/** Optional commit message attached to a saved file revision. */
export const saveFileSchema = z.object({
  message: z.string().max(200, "Message must be 200 characters or fewer"),
});

export type SaveFileValues = z.infer<typeof saveFileSchema>;
