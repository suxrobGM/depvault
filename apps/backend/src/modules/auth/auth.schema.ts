import { t, type Static } from "elysia";

export const RegisterBodySchema = t.Object({
  email: t.String({ format: "email" }),
  username: t.String({ minLength: 3, maxLength: 30 }),
  password: t.String({ minLength: 8, maxLength: 128 }),
});

export const RefreshBodySchema = t.Object({
  refreshToken: t.String(),
});

export const AuthResponseSchema = t.Object({
  accessToken: t.String(),
  refreshToken: t.String(),
  user: t.Object({
    id: t.String(),
    email: t.String(),
    username: t.String(),
    role: t.String(),
    emailVerified: t.Boolean(),
  }),
});

export type RegisterBody = Static<typeof RegisterBodySchema>;
export type RefreshBody = Static<typeof RefreshBodySchema>;
export type AuthResponse = Static<typeof AuthResponseSchema>;
