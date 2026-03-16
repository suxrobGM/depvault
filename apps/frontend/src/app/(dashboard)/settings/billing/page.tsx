import type { ReactElement } from "react";
import { Box } from "@mui/material";
import { BillingAlerts, BillingOverview, PlanComparison } from "@/components/features/billing";
import { PageHeader } from "@/components/ui/containers";
import { ROUTES } from "@/lib/constants";

interface BillingPageProps {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}

export default async function BillingPage(props: BillingPageProps): Promise<ReactElement> {
  const { success, canceled } = await props.searchParams;

  return (
    <Box>
      <PageHeader
        title="Billing"
        subtitle="Manage your subscription and view usage"
        breadcrumbs={[{ label: "Settings", href: ROUTES.settings }, { label: "Billing" }]}
      />
      <BillingAlerts success={success === "true"} canceled={canceled === "true"} />
      <BillingOverview />
      <PlanComparison />
    </Box>
  );
}
