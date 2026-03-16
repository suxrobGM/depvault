import type { client } from "@/lib/api";
import type { Data } from "./utils";

export type SubscriptionResponse = Data<(typeof client)["api"]["subscription"]["get"]>;
export type SubscriptionLimits = SubscriptionResponse["limits"];
export type SubscriptionUsage = SubscriptionResponse["usage"];
export type SubscriptionPlan = SubscriptionResponse["plan"];

export type PlansResponse = Data<(typeof client)["api"]["subscription"]["plans"]["get"]>;
export type PlanInfo = PlansResponse[number];

export type CheckoutSessionResponse = Data<
  (typeof client)["api"]["subscription"]["checkout"]["post"]
>;
export type CreateCheckoutBody = Parameters<
  (typeof client)["api"]["subscription"]["checkout"]["post"]
>[0];

export type PortalSessionResponse = Data<(typeof client)["api"]["subscription"]["portal"]["post"]>;
export type CreatePortalBody = Parameters<
  (typeof client)["api"]["subscription"]["portal"]["post"]
>[0];
