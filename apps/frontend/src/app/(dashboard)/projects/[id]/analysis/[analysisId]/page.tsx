import type { ReactElement } from "react";
import { AnalysisDetailView } from "@/components/features/projects/analysis/analysis-detail-view";

interface PageProps {
  params: Promise<{ id: string; analysisId: string }>;
}

export default async function ProjectAnalysisDetailPage(props: PageProps): Promise<ReactElement> {
  const { id, analysisId } = await props.params;
  return <AnalysisDetailView projectId={id} analysisId={analysisId} />;
}
