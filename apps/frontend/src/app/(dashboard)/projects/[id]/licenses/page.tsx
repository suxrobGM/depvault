import type { ReactElement } from "react";
import { LicenseTab } from "@/components/features/projects/licenses/license-tab";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectLicensesPage(props: PageProps): Promise<ReactElement> {
  const { id } = await props.params;
  return <LicenseTab projectId={id} />;
}
