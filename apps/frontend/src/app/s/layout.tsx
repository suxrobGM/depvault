import type { PropsWithChildren, ReactElement } from "react";
import { NotificationProvider, QueryProvider } from "@/providers";
import { PlanLimitProvider } from "@/providers/subscription-provider";

export default function SharedSecretLayout(props: PropsWithChildren): ReactElement {
  const { children } = props;
  return (
    <QueryProvider>
      <NotificationProvider>
        <PlanLimitProvider>{children}</PlanLimitProvider>
      </NotificationProvider>
    </QueryProvider>
  );
}
