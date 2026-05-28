import type { ReactElement } from "react";
import { SecretFilesTab } from "@/components/features/projects/vault/secret-files/secret-files-tab";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VaultSecretFilesPage(props: PageProps): Promise<ReactElement> {
  const { id } = await props.params;
  return <SecretFilesTab projectId={id} />;
}
