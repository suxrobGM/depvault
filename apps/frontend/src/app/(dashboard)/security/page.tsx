import type { ReactElement } from "react";
import { Box } from "@mui/material";
import { SecurityOverviewView } from "@/components/features/security/security-overview-view";
import { PageHeader } from "@/components/ui/containers";
import { ROUTES } from "@/lib/constants";

export default function SecurityPage(): ReactElement {
  return (
    <Box>
      <PageHeader
        title="Security"
        subtitle="Vulnerability and secret scan overview across all your projects"
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.dashboard }, { label: "Security" }]}
      />
      <SecurityOverviewView />
    </Box>
  );
}
