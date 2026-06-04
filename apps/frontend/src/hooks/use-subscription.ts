"use client";

import { SubscriptionPlanName } from "@depvault/shared/constants";
import { client } from "@/api/client";
import { useApiQuery } from "@/api/hooks";
import { queryKeys } from "@/api/query-keys";
import type { SubscriptionDto } from "@/api/types";

/** Fetches the current user's subscription data including plan, limits, and usage. */
export function useSubscription() {
  const query = useApiQuery<SubscriptionDto>(
    queryKeys.subscription.current(),
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
