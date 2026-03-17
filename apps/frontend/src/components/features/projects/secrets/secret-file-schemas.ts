import { z } from "zod/v4";

export const uploadSecretFileSchema = z.object({
  vaultGroupId: z.string().min(1, "Select a vault group"),
  description: z.string().max(500),
});

export const editSecretFileSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(500),
  vaultGroupId: z.string(),
});
