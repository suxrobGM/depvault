import { CONFIG_FORMAT_VALUES, ENVIRONMENT_TYPE_VALUES } from "@depvault/shared/constants";
import { z } from "zod/v4";

export const createVariableSchema = z.object({
  environmentType: z.enum(ENVIRONMENT_TYPE_VALUES),
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
  environmentType: z.enum(ENVIRONMENT_TYPE_VALUES),
  format: z.enum(CONFIG_FORMAT_VALUES),
  content: z.string().min(1, "Content is required"),
});

export const exportVariablesSchema = z.object({
  environmentType: z.enum(ENVIRONMENT_TYPE_VALUES),
  format: z.enum(CONFIG_FORMAT_VALUES),
});
