import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { AuthResponseSchema, RefreshBodySchema, RegisterBodySchema } from "./auth.schema";
import { AuthService } from "./auth.service";

const authService = container.resolve(AuthService);

export const authController = new Elysia({ prefix: "/auth", detail: { tags: ["Auth"] } })
  .post("/register", ({ body }) => authService.register(body), {
    body: RegisterBodySchema,
    response: AuthResponseSchema,
    detail: { summary: "Register with email and password" },
  })
  .post("/refresh", ({ body }) => authService.refresh(body), {
    body: RefreshBodySchema,
    response: AuthResponseSchema,
    detail: { summary: "Refresh access token using refresh token" },
  });
