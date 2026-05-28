import type { ReactElement } from "react";
import { Box } from "@mui/material";
import { GlobalActivityView } from "@/components/features/dashboard/activity/global-activity-view";
import { PageHeader } from "@/components/ui/containers";
import { ROUTES } from "@/lib/constants";

export default function ActivityPage(): ReactElement {
  return (
    <Box>
      <PageHeader
        title="Activity"
        subtitle="Recent activity across all your projects"
        breadcrumbs={[{ label: "Overview", href: ROUTES.overview }, { label: "Activity" }]}
      />
      <GlobalActivityView />
    </Box>
  );
}
