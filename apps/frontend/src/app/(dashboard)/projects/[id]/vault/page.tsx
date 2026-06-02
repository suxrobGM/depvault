import type { ReactElement } from "react";
import { RepoPageShell } from "@/components/features/projects/repo";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectVaultPage(props: PageProps): Promise<ReactElement> {
  const { id } = await props.params;
  return <RepoPageShell projectId={id} />;
}
