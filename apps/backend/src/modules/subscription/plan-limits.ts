import { INFINITE_LIMIT } from "@depvault/shared/constants";
import type { SubscriptionPlan } from "@/generated/prisma";

export interface PlanLimits {
  maxUsers: number;
  maxProjects: number;
  maxEnvVars: number;
  maxSecretFiles: number;
  maxAnalysesPerMonth: number;
  maxCiTokens: number;
  auditLogRetentionDays: number;
  gitSecretScanning: boolean;
  ipAllowlists: boolean;
  secretSharing: boolean;
  envDiff: boolean;
  prioritySupport: boolean;
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  FREE: {
    maxUsers: 1,
    maxProjects: 3,
    maxEnvVars: 100,
    maxSecretFiles: 10,
    maxAnalysesPerMonth: 30,
    maxCiTokens: 5,
    auditLogRetentionDays: 0,
    gitSecretScanning: false,
    ipAllowlists: false,
    secretSharing: true,
    envDiff: false,
    prioritySupport: false,
  },
  PRO: {
    maxUsers: 10,
    maxProjects: 20,
    maxEnvVars: 1000,
    maxSecretFiles: 200,
    maxAnalysesPerMonth: 200,
    maxCiTokens: 50,
    auditLogRetentionDays: 30,
    gitSecretScanning: true,
    ipAllowlists: false,
    secretSharing: true,
    envDiff: true,
    prioritySupport: false,
  },
  TEAM: {
    maxUsers: INFINITE_LIMIT,
    maxProjects: INFINITE_LIMIT,
    maxEnvVars: INFINITE_LIMIT,
    maxSecretFiles: INFINITE_LIMIT,
    maxAnalysesPerMonth: INFINITE_LIMIT,
    maxCiTokens: INFINITE_LIMIT,
    auditLogRetentionDays: 365,
    gitSecretScanning: true,
    ipAllowlists: true,
    secretSharing: true,
    envDiff: true,
    prioritySupport: true,
  },
};

/** Plan pricing in cents for display and MRR calculation */
export const PLAN_PRICING: Record<SubscriptionPlan, number> = {
  FREE: 0,
  PRO: 500, // $5.00 per user per month
  TEAM: 1000, // $10.00 per user per month
};

/** Returns the plan limits for a given plan */
export function getPlanLimits(plan: SubscriptionPlan): PlanLimits {
  return PLAN_LIMITS[plan];
}
