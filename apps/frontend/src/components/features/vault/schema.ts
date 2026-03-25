import { z } from "zod/v4";

export const vaultRecoverySchema = z
  .object({
    recoveryKey: z.string().refine((val) => val.replace(/-/g, "").length >= 32, {
      message: "Recovery key must be at least 32 characters (excluding dashes)",
    }),
    newPassword: z.string().min(8, "Must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const vaultSetupSchema = z
  .object({
    password: z.string().min(8, "Must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const vaultUnlockSchema = z.object({
  password: z.string().min(1, "Password is required"),
});
