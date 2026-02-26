import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";

/**
 * Elysia plugin for Swagger/OpenAPI documentation.
 */
export const swaggerPlugin = new Elysia({ name: "swagger" }).use(
  swagger({
    documentation: {
      info: {
        title: "Connect API",
        version: "1.0.0",
        description: "Connect platform API — paid 1-on-1 communication between fans and creators",
      },
      tags: [
        { name: "Auth", description: "Authentication & authorization" },
        { name: "Users", description: "User profile management" },
        { name: "Admin", description: "Admin management" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "JWT access token obtained from /auth/login or /auth/register",
          },
        },
      },
    },
  }),
);
