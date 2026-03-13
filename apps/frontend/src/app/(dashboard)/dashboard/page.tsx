import type { ReactElement } from "react";
import { Box } from "@mui/material";
import { DashboardGreeting } from "@/components/features/dashboard/dashboard-greeting";
import { DashboardQuickActions } from "@/components/features/dashboard/dashboard-quick-actions";
import { DashboardRecentProjects } from "@/components/features/dashboard/dashboard-recent-projects";
import { DashboardStats } from "@/components/features/dashboard/dashboard-stats";
import { getServerClient } from "@/lib/api-server";

export default async function DashboardPage(): Promise<ReactElement> {
  const client = await getServerClient();
  const { data } = await client.api.projects.get({ query: { page: 1, limit: 3 } });
  const projects = data?.items ?? [];

  return (
    <Box>
      <DashboardGreeting />
      <DashboardStats />
      <DashboardQuickActions />
      <DashboardRecentProjects projects={projects} />
    </Box>
  );
}
