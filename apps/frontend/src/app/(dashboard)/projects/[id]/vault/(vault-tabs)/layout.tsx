import type { ReactElement, ReactNode } from "react";
import { VaultLayoutShell } from "@/components/features/projects/vault/vault-layout-shell";

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

export default async function VaultTabsLayout(props: LayoutProps): Promise<ReactElement> {
  const { id } = await props.params;
  return <VaultLayoutShell projectId={id}>{props.children}</VaultLayoutShell>;
}
