import type { ReactElement } from "react";
import { SecretScanningView } from "@/components/features/projects/secret-scanning";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectSecretScanningPage(props: PageProps): Promise<ReactElement> {
  const { id } = await props.params;
  return <SecretScanningView projectId={id} />;
}
