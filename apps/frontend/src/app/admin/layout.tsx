import { Suspense, type PropsWithChildren, type ReactElement } from "react";
import { UserRole } from "@depvault/shared/constants";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { getServerClient } from "@/lib/api-server";
import { ROUTES } from "@/lib/constants";
import { AuthProvider, ConfirmProvider, NotificationProvider, QueryProvider } from "@/providers";
import { PlanLimitProvider } from "@/providers/subscription-provider";

async function getUser() {
  const client = await getServerClient();
  const { data, error } = await client.api.users.me.get();
  if (error) return null;
  return data;
}

async function AuthenticatedAdminSidebar(props: PropsWithChildren): Promise<ReactElement> {
  const { children } = props;
  const user = await getUser();

  if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
    redirect(ROUTES.dashboard);
  }

  return (
    <AuthProvider initialUser={user}>
      <PlanLimitProvider>
        <AdminSidebar>{children}</AdminSidebar>
      </PlanLimitProvider>
    </AuthProvider>
  );
}

export default function AdminLayout(props: PropsWithChildren): ReactElement {
  const { children } = props;
  return (
    <QueryProvider>
      <NotificationProvider>
        <ConfirmProvider>
          <Suspense>
            <AuthenticatedAdminSidebar>{children}</AuthenticatedAdminSidebar>
          </Suspense>
        </ConfirmProvider>
      </NotificationProvider>
    </QueryProvider>
  );
}
