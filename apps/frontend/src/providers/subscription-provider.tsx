"use client";

import { createContext, useState, type PropsWithChildren, type ReactElement } from "react";
import { UpgradePrompt } from "@/components/features/billing";
import { useSubscription } from "@/hooks/use-subscription";

interface UpgradeDialogState {
  resource: string;
  limit: number;
  current: number;
}

interface SubscriptionContextValue {
  plan: "FREE" | "PRO" | "TEAM";
  isFreePlan: boolean;
  isProPlan: boolean;
  isTeamPlan: boolean;
  showUpgradePrompt: (resource: string, limit: number, current: number) => void;
}

export const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

/** Provides subscription state and an upgrade dialog to the component tree. */
export function SubscriptionProvider(props: PropsWithChildren): ReactElement {
  const { children } = props;
  const { plan, isFreePlan, isProPlan, isTeamPlan } = useSubscription();
  const [upgradeDialog, setUpgradeDialog] = useState<UpgradeDialogState | null>(null);
  const currentPlan = plan as "FREE" | "PRO" | "TEAM";

  const showUpgradePrompt = (resource: string, limit: number, current: number) => {
    setUpgradeDialog({ resource, limit, current });
  };

  const handleClose = () => {
    setUpgradeDialog(null);
  };

  const value: SubscriptionContextValue = {
    plan: currentPlan,
    isFreePlan,
    isProPlan,
    isTeamPlan,
    showUpgradePrompt,
  };

  return (
    <SubscriptionContext value={value}>
      {children}
      {upgradeDialog && (
        <UpgradePrompt
          open
          onClose={handleClose}
          resource={upgradeDialog.resource}
          limit={upgradeDialog.limit}
          current={upgradeDialog.current}
        />
      )}
    </SubscriptionContext>
  );
}
