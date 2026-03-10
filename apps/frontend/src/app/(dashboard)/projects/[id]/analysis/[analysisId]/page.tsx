import type { ReactElement } from "react";
import { AnalysisDetailPage } from "@/components/features/projects/analysis/analysis-detail-page";

interface PageProps {
  params: Promise<{ id: string; analysisId: string }>;
}

export default async function ProjectAnalysisDetailPage(props: PageProps): Promise<ReactElement> {
  const { id, analysisId } = await props.params;
  return <AnalysisDetailPage projectId={id} analysisId={analysisId} />;
}
