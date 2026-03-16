import type { ReactElement } from "react";
import { Box } from "@mui/material";
import { SubscriptionsTable } from "@/components/features/admin";
import { PageHeader } from "@/components/ui/containers";
import { ROUTES } from "@/lib/constants";

export default function AdminSubscriptionsPage(): ReactElement {
  return (
    <Box>
      <PageHeader
        title="Subscriptions"
        subtitle="View and manage all platform subscriptions"
        breadcrumbs={[{ label: "Admin", href: ROUTES.admin }, { label: "Subscriptions" }]}
      />
      <SubscriptionsTable />
    </Box>
  );
}
