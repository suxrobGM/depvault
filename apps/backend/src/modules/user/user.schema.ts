import { t, type Static } from "elysia";

export const UserProfileResponseSchema = t.Object({
  id: t.String(),
  email: t.String(),
  firstName: t.String(),
  lastName: t.String(),
  role: t.String(),
  avatarUrl: t.Nullable(t.String()),
  emailVerified: t.Boolean(),
  githubId: t.Nullable(t.String()),
  githubUsername: t.Nullable(t.String()),
  hasPassword: t.Boolean(),
  createdAt: t.String(),
});

export const UpdateProfileBodySchema = t.Object({
  firstName: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
  lastName: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
  avatarUrl: t.Optional(t.Nullable(t.String())),
});

export const ChangePasswordBodySchema = t.Object({
  currentPassword: t.Optional(t.String()),
  newPassword: t.String({ minLength: 8, maxLength: 128 }),
});

export const ChangeEmailBodySchema = t.Object({
  newEmail: t.String({ format: "email" }),
  password: t.String(),
});

export const MessageResponseSchema = t.Object({
  message: t.String(),
});

export const AvatarUploadBodySchema = t.Object({
  file: t.File({ maxSize: "5m" }),
});

export const AvatarUploadResponseSchema = t.Object({
  avatarUrl: t.String(),
});

export type UserProfileResponse = Static<typeof UserProfileResponseSchema>;
export type UpdateProfileBody = Static<typeof UpdateProfileBodySchema>;
export type ChangePasswordBody = Static<typeof ChangePasswordBodySchema>;
export type ChangeEmailBody = Static<typeof ChangeEmailBodySchema>;
