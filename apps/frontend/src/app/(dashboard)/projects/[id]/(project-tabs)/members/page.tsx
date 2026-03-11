import type { ReactElement } from "react";
import { MembersTab } from "@/components/features/projects/members/members-tab";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectMembersPage(props: PageProps): Promise<ReactElement> {
  const { id } = await props.params;
  return <MembersTab projectId={id} />;
}
