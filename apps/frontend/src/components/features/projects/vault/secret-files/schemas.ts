import { z } from "zod/v4";

export const uploadSecretFileSchema = z.object({
  vaultId: z.string().min(1, "Select a vault"),
  description: z.string().max(500),
});

export const editSecretFileSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(500),
  vaultId: z.string(),
});
