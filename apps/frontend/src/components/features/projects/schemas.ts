import { z } from "zod/v4";

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(100, "Name must be 100 characters or less"),
  description: z.string().max(500),
  repositoryUrl: z
    .string()
    .max(500)
    .refine((val) => val === "" || z.url().safeParse(val).success, "Please enter a valid URL"),
});

export const updateProjectSchema = createProjectSchema;

export const inviteMemberSchema = z.object({
  email: z.email("Please enter a valid email address"),
  role: z.enum(["EDITOR", "VIEWER"]),
});
