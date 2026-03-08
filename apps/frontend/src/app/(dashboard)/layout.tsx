import type { PropsWithChildren, ReactElement } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { API_BASE_URL, COOKIE_NAMES, ROUTES } from "@/lib/constants";
import { AuthProvider, NotificationProvider, QueryProvider } from "@/providers";

async function getUser() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(COOKIE_NAMES.accessToken)?.value;

  if (!accessToken) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
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
