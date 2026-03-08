import type { PropsWithChildren, ReactElement } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getServerClient } from "@/lib/api-server";
import { ROUTES } from "@/lib/constants";
import { AuthProvider, NotificationProvider, QueryProvider } from "@/providers";

async function getUser() {
  const client = await getServerClient();
  const { data, error } = await client.api.users.me.get();
  if (error) return null;
  return data;
}

export default async function DashboardLayout({
  children,
}: PropsWithChildren): Promise<ReactElement> {
  const user = await getUser();

  if (!user) {
    redirect(ROUTES.login);
  }

  return (
    <QueryProvider>
      <NotificationProvider>
        <AuthProvider initialUser={user}>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </NotificationProvider>
    </QueryProvider>
  );
}
