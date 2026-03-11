import type { ReactElement, ReactNode } from "react";
import { ProjectLayoutShell } from "@/components/features/projects/project-layout-shell";

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

export default async function ProjectTabsLayout(props: LayoutProps): Promise<ReactElement> {
  const { id } = await props.params;
  return <ProjectLayoutShell projectId={id}>{props.children}</ProjectLayoutShell>;
}
