import type { ReactElement } from "react";
import { Box } from "@mui/material";
import { NotificationsView } from "@/components/features/notifications";
import { PageHeader } from "@/components/ui/containers";
import { ROUTES } from "@/lib/constants";

export default function NotificationsPage(): ReactElement {
  return (
    <Box>
      <PageHeader
        title="Notifications"
        subtitle="Stay updated on security events, team activity, and environment changes"
        breadcrumbs={[{ label: "Overview", href: ROUTES.overview }, { label: "Notifications" }]}
      />
      <NotificationsView />
    </Box>
  );
}
