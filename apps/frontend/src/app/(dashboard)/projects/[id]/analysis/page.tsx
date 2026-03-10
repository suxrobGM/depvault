import type { ReactElement } from "react";
import { AnalysisListView } from "@/components/features/projects/analysis/analysis-list-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectAnalysisPage(props: PageProps): Promise<ReactElement> {
  const { id } = await props.params;
  return <AnalysisListView projectId={id} />;
}
