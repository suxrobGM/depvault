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
      servers: [{ url: "http://localhost:4000", description: "Local development" }],
      tags: [
        { name: "Auth", description: "Registration, login, OAuth, token management" },
        { name: "Users", description: "User profile and account management" },
        { name: "Projects", description: "Project CRUD and team membership" },
        { name: "Analyses", description: "Dependency analysis and vulnerability scanning" },
        { name: "Environments", description: "Environment variable vault management" },
        { name: "Secrets", description: "Secret file storage and one-time sharing" },
        { name: "CI/CD Tokens", description: "CI/CD pipeline token management" },
        { name: "CI/CD Access", description: "CI/CD secret retrieval endpoints" },
        { name: "Notifications", description: "User notification management" },
        { name: "Audit Log", description: "Project and global audit trail" },
        { name: "License Rules", description: "License compliance policy management" },
        { name: "Secret Scanning", description: "Git-aware secret detection" },
        { name: "Templates", description: "Environment variable templates" },
        { name: "GitHub", description: "GitHub repository integration" },
        { name: "Convert", description: "Config format conversion" },
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
