import type { ReactElement } from "react";
import { OverviewTab } from "@/components/features/projects/overview-tab";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectOverviewPage(props: PageProps): Promise<ReactElement> {
  const { id } = await props.params;
  return <OverviewTab projectId={id} />;
}
