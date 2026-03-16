import type { ReactElement } from "react";
import { Alert, Box } from "@mui/material";
import { BillingOverview, PlanComparison } from "@/components/features/billing";
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
      {success === "true" && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Your subscription has been updated successfully. Changes may take a moment to reflect.
        </Alert>
      )}
      {canceled === "true" && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Checkout was canceled. No changes were made to your subscription.
        </Alert>
      )}
      <BillingOverview />
      <PlanComparison />
    </Box>
  );
}
