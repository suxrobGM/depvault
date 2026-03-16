"use client";

import {
  isUnlimited,
  SubscriptionPlanName,
  type SubscriptionPlanValue,
} from "@depvault/shared/constants";
import { useSubscription } from "./use-subscription";

type ResourceType = "projects" | "envVars" | "secretFiles" | "analyses" | "members" | "ciTokens";

interface PlanGateResult {
  allowed: boolean;
  limit: number;
  current: number;
  upgradeRequired: SubscriptionPlanValue | null;
}

const LIMIT_MAP: Record<ResourceType, string> = {
  projects: "maxProjects",
  envVars: "maxEnvVars",
  secretFiles: "maxSecretFiles",
  analyses: "maxAnalysesPerMonth",
  members: "maxUsers",
  ciTokens: "maxCiTokens",
};

/** Checks whether a specific resource limit has been reached based on the current subscription. */
export function usePlanGate(resource: ResourceType): PlanGateResult {
  const { limits, usage, plan } = useSubscription();

  if (!limits || !usage) {
    return { allowed: true, limit: 0, current: 0, upgradeRequired: null };
  }

  const limitKey = LIMIT_MAP[resource] as keyof typeof limits;
  const limit = limits[limitKey] as number;
  const current = usage[resource] as number;
  const allowed = isUnlimited(limit) || current < limit;

  let upgradeRequired: SubscriptionPlanValue | null = null;
  if (!allowed) {
    upgradeRequired =
      plan === SubscriptionPlanName.FREE ? SubscriptionPlanName.PRO : SubscriptionPlanName.TEAM;
  }

  return { allowed, limit, current, upgradeRequired };
}
