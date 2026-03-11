import type { ReactElement } from "react";
import { VaultPageView } from "@/components/features/projects/vault/vault-page-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectVaultPage(props: PageProps): Promise<ReactElement> {
  const { id } = await props.params;
  return <VaultPageView projectId={id} />;
}
