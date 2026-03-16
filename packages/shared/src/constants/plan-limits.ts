/** Sentinel value representing an unlimited plan limit. JSON-serializable (-1). */
export const INFINITE_LIMIT = -1;

/** Returns true if the given limit value represents unlimited. */
export function isUnlimited(limit: number): boolean {
  return limit === INFINITE_LIMIT;
}

export const SubscriptionPlanName = {
  FREE: "FREE",
  PRO: "PRO",
  TEAM: "TEAM",
} as const;

export type SubscriptionPlanValue =
  (typeof SubscriptionPlanName)[keyof typeof SubscriptionPlanName];

export const PLAN_ORDER: Record<SubscriptionPlanValue, number> = {
  FREE: 0,
  PRO: 1,
  TEAM: 2,
};
