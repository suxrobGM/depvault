import { CONFIG_FORMAT_VALUES } from "@depvault/shared/constants";
import { z } from "zod/v4";

export const createVariableSchema = z.object({
  key: z.string().min(1, "Key is required").max(255),
  value: z.string(),
  description: z.string().max(500),
  isRequired: z.boolean(),
});

export const updateVariableSchema = z.object({
  key: z.string().min(1).max(255),
  value: z.string(),
  description: z.string().max(500),
  isRequired: z.boolean(),
});

export const importVariablesSchema = z.object({
  format: z.enum(CONFIG_FORMAT_VALUES),
  content: z.string().min(1, "Content is required"),
});

export const exportVariablesSchema = z.object({
  format: z.enum(CONFIG_FORMAT_VALUES),
});

export const createVaultSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  directoryPath: z.string().max(500),
});

export const cloneVaultSchema = z.object({
  targetName: z.string().min(1, "Target name is required").max(100),
});
