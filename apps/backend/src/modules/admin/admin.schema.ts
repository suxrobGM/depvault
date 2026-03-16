import { t, type Static } from "elysia";
import { PaginationQuerySchema } from "@/types/pagination";
import { PaginatedResponseSchema } from "@/types/response";

export const AdminUserListQuerySchema = PaginationQuerySchema(
  t.Object({
    search: t.Optional(t.String()),
    plan: t.Optional(t.Union([t.Literal("FREE"), t.Literal("PRO"), t.Literal("TEAM")])),
  }),
);

export const AdminUserResponseSchema = t.Object({
  id: t.String(),
  email: t.String(),
  firstName: t.String(),
  lastName: t.String(),
  role: t.String(),
  emailVerified: t.Boolean(),
  createdAt: t.Date(),
  subscription: t.Nullable(
    t.Object({
      plan: t.String(),
      status: t.String(),
      isComp: t.Boolean(),
      currentPeriodEnd: t.Nullable(t.Date()),
    }),
  ),
});

export const AdminUserListResponseSchema = PaginatedResponseSchema(AdminUserResponseSchema);

export const AdminSubscriptionListQuerySchema = PaginationQuerySchema(
  t.Object({
    plan: t.Optional(t.Union([t.Literal("FREE"), t.Literal("PRO"), t.Literal("TEAM")])),
    status: t.Optional(t.String()),
    isComp: t.Optional(t.Boolean()),
  }),
);

export const AdminSubscriptionResponseSchema = t.Object({
  id: t.String(),
  userId: t.String(),
  plan: t.String(),
  status: t.String(),
  isComp: t.Boolean(),
  quantity: t.Number(),
  currentPeriodEnd: t.Nullable(t.Date()),
  createdAt: t.Date(),
  user: t.Object({
    email: t.String(),
    firstName: t.String(),
    lastName: t.String(),
  }),
});

export const AdminSubscriptionListResponseSchema = PaginatedResponseSchema(
  AdminSubscriptionResponseSchema,
);

export const AdminStatsResponseSchema = t.Object({
  totalUsers: t.Number(),
  planBreakdown: t.Object({
    free: t.Number(),
    pro: t.Number(),
    team: t.Number(),
  }),
  activeSubscriptions: t.Number(),
  canceledSubscriptions: t.Number(),
  isCompCount: t.Number(),
  mrr: t.Number(),
});

export const CompSubscriptionBodySchema = t.Object({
  plan: t.Union([t.Literal("PRO"), t.Literal("TEAM")]),
});

export const AdminUserDetailResponseSchema = t.Object({
  id: t.String(),
  email: t.String(),
  firstName: t.String(),
  lastName: t.String(),
  role: t.String(),
  emailVerified: t.Boolean(),
  createdAt: t.Date(),
  subscription: t.Nullable(
    t.Object({
      id: t.String(),
      plan: t.String(),
      status: t.String(),
      isComp: t.Boolean(),
      stripeCustomerId: t.Nullable(t.String()),
      stripeSubscriptionId: t.Nullable(t.String()),
      quantity: t.Number(),
      currentPeriodStart: t.Nullable(t.Date()),
      currentPeriodEnd: t.Nullable(t.Date()),
      cancelAtPeriodEnd: t.Boolean(),
    }),
  ),
  usage: t.Object({
    projects: t.Number(),
    envVars: t.Number(),
    secretFiles: t.Number(),
    analyses: t.Number(),
    members: t.Number(),
    ciTokens: t.Number(),
  }),
  ownedProjectCount: t.Number(),
});

export type AdminUserListQuery = Static<typeof AdminUserListQuerySchema>;
export type AdminSubscriptionListQuery = Static<typeof AdminSubscriptionListQuerySchema>;
export type CompSubscriptionBody = Static<typeof CompSubscriptionBodySchema>;
