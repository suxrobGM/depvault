import type { client } from "@/lib/api";
import type { Data } from "./utils";

export type AdminStatsResponse = Data<(typeof client)["api"]["admin"]["stats"]["get"]>;

export type AdminUserListResponse = Data<(typeof client)["api"]["admin"]["users"]["get"]>;
export type AdminUser = AdminUserListResponse["items"][number];

type AdminUserById = ReturnType<(typeof client)["api"]["admin"]["users"]>;
export type AdminUserDetailResponse = Data<AdminUserById["get"]>;

export type AdminSubscriptionListResponse = Data<
  (typeof client)["api"]["admin"]["subscriptions"]["get"]
>;
export type AdminSubscription = AdminSubscriptionListResponse["items"][number];

export type CompSubscriptionBody = Parameters<AdminUserById["subscription"]["patch"]>[0];
