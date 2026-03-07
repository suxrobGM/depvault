import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";

export const swaggerPlugin = new Elysia({ name: "swagger" }).use(
  swagger({
    documentation: {
      info: {
        title: "DepVault API",
        version: "1.0.0",
        description:
          "DepVault platform API — dependency analysis, vulnerability scanning, and encrypted secret management across any tech stack",
      },
      tags: [
        { name: "Auth", description: "Registration, login, OAuth, token management" },
        { name: "Users", description: "User profile and account management" },
        { name: "Projects", description: "Project CRUD and team membership" },
        { name: "Secrets", description: "One-time secret sharing and file downloads" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "JWT access token obtained from /api/auth/login or /api/auth/register",
          },
        },
      },
    },
  }),
);
