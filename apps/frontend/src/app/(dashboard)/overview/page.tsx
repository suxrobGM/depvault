import type { ReactElement } from "react";
import { Box } from "@mui/material";
import { Greeting } from "@/components/features/dashboard/home/greeting";
import { QuickActions } from "@/components/features/dashboard/home/quick-actions";
import { RecentProjects } from "@/components/features/dashboard/home/recent-projects";
import { Stats } from "@/components/features/dashboard/home/stats";
import { getServerClient } from "@/lib/api-server";

export default async function OverviewPage(): Promise<ReactElement> {
  const client = await getServerClient();
  const { data } = await client.api.projects.get({ query: { page: 1, limit: 3 } });
  const projects = data?.items ?? [];

  return (
    <Box>
      <Greeting />
      <Stats />
      <QuickActions />
      <RecentProjects projects={projects} />
    </Box>
  );
}
