import type { client } from "@/lib/api";
import type { Body, Data } from "./utils";

type Admin = typeof client.api.admin;
type AdminUserById = ReturnType<Admin["users"]>;

export type AdminStatsDto = Data<Admin["stats"]["get"]>;

export type AdminUserListResponseDto = Data<Admin["users"]["get"]>;
export type AdminUserDto = AdminUserListResponseDto["items"][number];

export type AdminUserDetailDto = Data<AdminUserById["get"]>;

export type AdminSubscriptionListResponseDto = Data<Admin["subscriptions"]["get"]>;
export type AdminSubscriptionDto = AdminSubscriptionListResponseDto["items"][number];

export type CompSubscriptionBody = Body<AdminUserById["subscription"]["patch"]>;
