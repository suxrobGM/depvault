import type { client } from "@/lib/api";
import type { Body, Data } from "./utils";

type Subscription = typeof client.api.subscription;

export type SubscriptionDto = Data<Subscription["get"]>;
export type SubscriptionLimitsDto = SubscriptionDto["limits"];
export type SubscriptionUsageDto = SubscriptionDto["usage"];
export type SubscriptionPlan = SubscriptionDto["plan"];

export type PlansResponseDto = Data<Subscription["plans"]["get"]>;
export type PlanInfoDto = PlansResponseDto[number];

export type CheckoutSessionDto = Data<Subscription["checkout"]["post"]>;
export type CreateCheckoutBody = Body<Subscription["checkout"]["post"]>;

export type PortalSessionDto = Data<Subscription["portal"]["post"]>;
export type CreatePortalBody = Body<Subscription["portal"]["post"]>;
