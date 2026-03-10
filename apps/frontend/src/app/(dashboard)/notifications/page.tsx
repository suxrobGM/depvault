import type { ReactElement } from "react";
import { Box } from "@mui/material";
import { NotificationsView } from "@/components/features/notifications";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/lib/constants";

export default function NotificationsPage(): ReactElement {
  return (
    <Box>
      <PageHeader
        title="Notifications"
        subtitle="Stay updated on security events, team activity, and environment changes"
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.dashboard }, { label: "Notifications" }]}
      />
      <NotificationsView />
    </Box>
  );
}
