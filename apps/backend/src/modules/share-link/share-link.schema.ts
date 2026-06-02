import { t, type Static } from "elysia";

export const CreateShareBodySchema = t.Object({
  encryptedPayload: t.String({ description: "Client-encrypted payload" }),
  iv: t.String(),
  authTag: t.String(),
  fileName: t.String(),
  mimeType: t.String(),
  expiresIn: t.Integer({ minimum: 3600, maximum: 2592000 }),
  password: t.Optional(t.String({ minLength: 1, maxLength: 128 })),
});

export const AccessShareBodySchema = t.Object({
  password: t.Optional(t.String()),
});

export const ShareLinkInfoResponseSchema = t.Object({
  hasPassword: t.Boolean(),
  fileName: t.Nullable(t.String()),
  mimeType: t.Nullable(t.String()),
  expiresAt: t.Date(),
});

export const AccessShareResponseSchema = t.Object({
  encryptedPayload: t.String(),
  iv: t.String(),
  authTag: t.String(),
  fileName: t.Nullable(t.String()),
  mimeType: t.Nullable(t.String()),
});

export const CreateShareResponseSchema = t.Object({
  token: t.String(),
  shareUrl: t.String(),
});

export const ShareLinkItemSchema = t.Object({
  id: t.String(),
  token: t.String(),
  status: t.UnionEnum(["PENDING", "VIEWED", "EXPIRED"] as const),
  hasPassword: t.Boolean(),
  fileName: t.Nullable(t.String()),
  expiresAt: t.Date(),
  viewedAt: t.Nullable(t.Date()),
  createdAt: t.Date(),
});

export const ShareLinkListResponseSchema = t.Object({
  items: t.Array(ShareLinkItemSchema),
});

export const ShareLinkParamsSchema = t.Object({
  id: t.String(),
  shareId: t.String(),
});

export const TokenParamSchema = t.Object({ token: t.String() });

export type CreateShareBody = Static<typeof CreateShareBodySchema>;
export type AccessShareBody = Static<typeof AccessShareBodySchema>;
export type ShareLinkInfoResponse = Static<typeof ShareLinkInfoResponseSchema>;
export type CreateShareResponse = Static<typeof CreateShareResponseSchema>;
export type ShareLinkItem = Static<typeof ShareLinkItemSchema>;
export type AccessShareResponse = Static<typeof AccessShareResponseSchema>;
