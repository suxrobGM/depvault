import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { authGuard } from "@/common/middleware/auth.middleware";
import {
  ChangeEmailBodySchema,
  ChangePasswordBodySchema,
  MessageResponseSchema,
  UpdateProfileBodySchema,
  UserProfileResponseSchema,
} from "./user.schema";
import { UserService } from "./user.service";

const userService = container.resolve(UserService);

export const userController = new Elysia({ prefix: "/users", detail: { tags: ["Users"] } })
  .use(authGuard)
  .get("/me", ({ user }) => userService.getProfile(user.id), {
    response: UserProfileResponseSchema,
    detail: { summary: "Get current user profile" },
  })
  .patch("/me", ({ user, body }) => userService.updateProfile(user.id, body), {
    body: UpdateProfileBodySchema,
    response: UserProfileResponseSchema,
    detail: { summary: "Update profile (username, avatar)" },
  })
  .patch("/me/password", ({ user, body }) => userService.changePassword(user.id, body), {
    body: ChangePasswordBodySchema,
    response: MessageResponseSchema,
    detail: { summary: "Change password" },
  })
  .patch("/me/email", ({ user, body }) => userService.changeEmail(user.id, body), {
    body: ChangeEmailBodySchema,
    response: MessageResponseSchema,
    detail: { summary: "Change email address" },
  })
  .delete("/me", ({ user }) => userService.deleteAccount(user.id), {
    response: MessageResponseSchema,
    detail: { summary: "Delete account (soft delete)" },
  });
