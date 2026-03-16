"use client";

import { SubscriptionPlanName } from "@depvault/shared/constants";
import { client } from "@/lib/api";
import type { SubscriptionResponse } from "@/types/api";
import { useApiQuery } from "./use-api-query";

/** Fetches the current user's subscription data including plan, limits, and usage. */
export function useSubscription() {
  const query = useApiQuery<SubscriptionResponse>(
    ["subscription"],
    () => client.api.subscription.get(),
    { errorMessage: "Failed to load subscription" },
  );

  const plan = query.data?.plan ?? SubscriptionPlanName.FREE;

  return {
    ...query,
    subscription: query.data ?? null,
    plan,
    limits: query.data?.limits ?? null,
    usage: query.data?.usage ?? null,
    isFreePlan: plan === SubscriptionPlanName.FREE,
    isProPlan: plan === SubscriptionPlanName.PRO,
    isTeamPlan: plan === SubscriptionPlanName.TEAM,
  };
}
