import type { ReactElement } from "react";
import { VaultVariablesView } from "@/components/features/projects/vault/vault-variables-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VaultVariablesPage(props: PageProps): Promise<ReactElement> {
  const { id } = await props.params;
  return <VaultVariablesView projectId={id} />;
}
