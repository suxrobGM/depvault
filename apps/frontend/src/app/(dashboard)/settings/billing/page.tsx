import type { ReactElement } from "react";
import { Box } from "@mui/material";
import { BillingOverview, PlanComparison } from "@/components/features/billing";
import { PageHeader } from "@/components/ui/containers";
import { ROUTES } from "@/lib/constants";

export default function BillingPage(): ReactElement {
  return (
    <Box>
      <PageHeader
        title="Billing"
        subtitle="Manage your subscription and view usage"
        breadcrumbs={[{ label: "Settings", href: ROUTES.settings }, { label: "Billing" }]}
      />
      <BillingOverview />
      <PlanComparison />
    </Box>
  );
}
