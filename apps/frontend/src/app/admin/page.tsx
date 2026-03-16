import type { ReactElement } from "react";
import { Box } from "@mui/material";
import { AdminStats } from "@/components/features/admin";
import { PageHeader } from "@/components/ui/containers";
import { ROUTES } from "@/lib/constants";

export default function AdminDashboardPage(): ReactElement {
  return (
    <Box>
      <PageHeader
        title="Admin Dashboard"
        subtitle="Platform overview and key metrics"
        breadcrumbs={[{ label: "Admin", href: ROUTES.admin }, { label: "Dashboard" }]}
      />
      <AdminStats />
    </Box>
  );
}
