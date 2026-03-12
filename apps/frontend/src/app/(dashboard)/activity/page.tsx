import type { ReactElement } from "react";
import { Box } from "@mui/material";
import { GlobalActivityView } from "@/components/features/activity/global-activity-view";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/lib/constants";

export default function ActivityPage(): ReactElement {
  return (
    <Box>
      <PageHeader
        title="Activity"
        subtitle="Recent activity across all your projects"
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.dashboard }, { label: "Activity" }]}
      />
      <GlobalActivityView />
    </Box>
  );
}
