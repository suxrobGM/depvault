import type { ReactElement } from "react";
import { SecretScanningPage } from "@/components/features/projects/security";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectSecretScanningPage(props: PageProps): Promise<ReactElement> {
  const { id } = await props.params;
  return <SecretScanningPage projectId={id} />;
}
