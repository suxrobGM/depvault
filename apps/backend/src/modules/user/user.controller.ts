import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { authGuard } from "@/common/middleware/auth.middleware";
import {
  AvatarUploadBodySchema,
  AvatarUploadResponseSchema,
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
    detail: {
      operationId: "getProfile",
      summary: "Get current user profile",
      description:
        "Return the authenticated user's profile including email, username, avatar, and linked accounts.",
      security: [{ bearerAuth: [] }],
    },
  })
  .patch("/me", ({ user, body }) => userService.updateProfile(user.id, body), {
    body: UpdateProfileBodySchema,
    response: UserProfileResponseSchema,
    detail: {
      operationId: "updateProfile",
      summary: "Update profile",
      description:
        "Update the authenticated user's username and/or avatar URL. Username must be unique.",
      security: [{ bearerAuth: [] }],
    },
  })
  .patch("/me/password", ({ user, body }) => userService.changePassword(user.id, body), {
    body: ChangePasswordBodySchema,
    response: MessageResponseSchema,
    detail: {
      operationId: "changePassword",
      summary: "Change password",
      description:
        "Change the authenticated user's password. Requires the current password for verification. Not available for OAuth-only accounts.",
      security: [{ bearerAuth: [] }],
    },
  })
  .patch("/me/email", ({ user, body }) => userService.changeEmail(user.id, body), {
    body: ChangeEmailBodySchema,
    response: MessageResponseSchema,
    detail: {
      operationId: "changeEmail",
      summary: "Change email address",
      description:
        "Change the authenticated user's email. Requires password verification. A new verification email is sent to the updated address.",
      security: [{ bearerAuth: [] }],
    },
  })
  .post("/me/avatar", ({ user, body }) => userService.uploadAvatar(user.id, body.file), {
    body: AvatarUploadBodySchema,
    response: AvatarUploadResponseSchema,
    detail: {
      operationId: "uploadAvatar",
      summary: "Upload avatar",
      description:
        "Upload and set the authenticated user's avatar image. Accepts jpg, png, gif, or webp up to 5 MB.",
      security: [{ bearerAuth: [] }],
    },
  })
  .delete("/me", ({ user }) => userService.deleteAccount(user.id), {
    response: MessageResponseSchema,
    detail: {
      operationId: "deleteAccount",
      summary: "Delete account",
      description:
        "Permanently delete the authenticated user's account and all associated data including projects, analyses, uploads, and secret files. This action is irreversible.",
      security: [{ bearerAuth: [] }],
    },
  });
