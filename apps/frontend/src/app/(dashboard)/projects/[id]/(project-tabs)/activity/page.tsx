import type { ReactElement } from "react";
import { ActivityLogView } from "@/components/features/projects/activity/activity-log-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectActivityPage(props: PageProps): Promise<ReactElement> {
  const { id } = await props.params;
  return <ActivityLogView projectId={id} />;
}
