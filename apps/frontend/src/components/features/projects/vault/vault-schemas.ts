import { CONFIG_FORMAT_VALUES } from "@depvault/shared/constants";
import { z } from "zod/v4";

export const createVariableSchema = z.object({
  environment: z.string().min(1, "Environment is required").max(100),
  key: z.string().min(1, "Key is required").max(255),
  value: z.string(),
  description: z.string().max(500),
  isRequired: z.boolean(),
  validationRule: z.string().max(255),
});

export const updateVariableSchema = z.object({
  key: z.string().min(1).max(255),
  value: z.string(),
  description: z.string().max(500),
  isRequired: z.boolean(),
  validationRule: z.string().max(255),
});

export const importVariablesSchema = z.object({
  environment: z.string().min(1, "Environment is required").max(100),
  environmentType: z.enum(["DEVELOPMENT", "STAGING", "PRODUCTION", "CUSTOM"]).optional(),
  format: z.enum(CONFIG_FORMAT_VALUES),
  content: z.string().min(1, "Content is required"),
});

export const exportVariablesSchema = z.object({
  environment: z.string().min(1),
  format: z.enum(CONFIG_FORMAT_VALUES),
});
