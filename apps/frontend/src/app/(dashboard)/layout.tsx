import { Suspense, type PropsWithChildren, type ReactElement } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getServerClient } from "@/lib/api-server";
import { ROUTES } from "@/lib/constants";
import { AuthProvider, ConfirmProvider, NotificationProvider, QueryProvider } from "@/providers";
import { PlanLimitProvider } from "@/providers/subscription-provider";
import { VaultProvider } from "@/providers/vault-provider";

async function getUser() {
  const client = await getServerClient();
  const { data, error } = await client.api.users.me.get();
  if (error) return null;
  return data;
}

async function AuthenticatedShell(props: PropsWithChildren): Promise<ReactElement> {
  const { children } = props;
  const user = await getUser();

  if (!user) {
    redirect(ROUTES.login);
  }

  return (
    <AuthProvider initialUser={user}>
      <VaultProvider>
        <AppShell>{children}</AppShell>
      </VaultProvider>
    </AuthProvider>
  );
}

export default function DashboardLayout(props: PropsWithChildren): ReactElement {
  const { children } = props;
  return (
    <QueryProvider>
      <NotificationProvider>
        <ConfirmProvider>
          <PlanLimitProvider>
            <Suspense>
              <AuthenticatedShell>{children}</AuthenticatedShell>
            </Suspense>
          </PlanLimitProvider>
        </ConfirmProvider>
      </NotificationProvider>
    </QueryProvider>
  );
}
