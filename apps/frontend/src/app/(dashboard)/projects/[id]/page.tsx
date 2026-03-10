import type { ReactElement } from "react";
import { ProjectDetailView } from "@/components/features/projects/project-detail-view";

const VALID_TABS = ["overview", "members", "settings"] as const;
type ProjectTab = (typeof VALID_TABS)[number];

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function ProjectDetailPage(props: PageProps): Promise<ReactElement> {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const tab: ProjectTab = VALID_TABS.includes(searchParams.tab as ProjectTab)
    ? (searchParams.tab as ProjectTab)
    : "overview";

  return <ProjectDetailView projectId={params.id} activeTab={tab} />;
}
