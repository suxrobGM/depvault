import { type PropsWithChildren, type ReactElement } from "react";
import { UserRole } from "@depvault/shared/constants";
import { Box } from "@mui/material";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { getServerClient } from "@/lib/api-server";
import { ROUTES } from "@/lib/constants";
import { AuthProvider, ConfirmProvider, NotificationProvider, QueryProvider } from "@/providers";

async function getUser() {
  const client = await getServerClient();
  const { data, error } = await client.api.users.me.get();
  if (error) return null;
  return data;
}

export default async function AdminLayout(props: PropsWithChildren): Promise<ReactElement> {
  const { children } = props;
  const user = await getUser();

  if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
    redirect(ROUTES.dashboard);
  }

  return (
    <QueryProvider>
      <NotificationProvider>
        <ConfirmProvider>
          <AuthProvider initialUser={user}>
            <Box sx={{ display: "flex", minHeight: "100vh" }}>
              <AdminSidebar />
              <Box component="main" sx={{ flex: 1, p: 3, ml: "260px" }}>
                {children}
              </Box>
            </Box>
          </AuthProvider>
        </ConfirmProvider>
      </NotificationProvider>
    </QueryProvider>
  );
}
