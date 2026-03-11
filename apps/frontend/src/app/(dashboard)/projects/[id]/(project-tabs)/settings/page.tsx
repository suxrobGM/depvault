import type { ReactElement } from "react";
import { SettingsTab } from "@/components/features/projects/settings/settings-tab";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectSettingsPage(props: PageProps): Promise<ReactElement> {
  const { id } = await props.params;
  return <SettingsTab projectId={id} />;
}
