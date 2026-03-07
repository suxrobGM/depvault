import { t, type Static } from "elysia";

export const UserProfileResponseSchema = t.Object({
  id: t.String(),
  email: t.String(),
  username: t.String(),
  role: t.String(),
  avatarUrl: t.Nullable(t.String()),
  emailVerified: t.Boolean(),
  githubId: t.Nullable(t.String()),
  createdAt: t.String(),
});

export const UpdateProfileBodySchema = t.Object({
  username: t.Optional(t.String({ minLength: 3, maxLength: 30 })),
  avatarUrl: t.Optional(t.Nullable(t.String())),
});

export const ChangePasswordBodySchema = t.Object({
  currentPassword: t.String(),
  newPassword: t.String({ minLength: 8, maxLength: 128 }),
});

export const ChangeEmailBodySchema = t.Object({
  newEmail: t.String({ format: "email" }),
  password: t.String(),
});

export const MessageResponseSchema = t.Object({
  message: t.String(),
});

export type UserProfileResponse = Static<typeof UserProfileResponseSchema>;
export type UpdateProfileBody = Static<typeof UpdateProfileBodySchema>;
export type ChangePasswordBody = Static<typeof ChangePasswordBodySchema>;
export type ChangeEmailBody = Static<typeof ChangeEmailBodySchema>;
