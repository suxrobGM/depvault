"use client";

import type { ReactElement } from "react";
import type { ProjectResponse } from "@/types/api/project";
import { MembersTab } from "./members/members-tab";
import { OverviewTab } from "./overview-tab";
import { SettingsTab } from "./settings/settings-tab";

interface ProjectTabPanelProps {
  activeTab: "overview" | "members" | "settings";
  project: ProjectResponse;
  projectId: string;
  isOwner: boolean;
  canEdit: boolean;
  memberCount: number;
}

export function ProjectTabPanel(props: ProjectTabPanelProps): ReactElement {
  const { activeTab, project, projectId, isOwner, canEdit, memberCount } = props;

  if (activeTab === "members") {
    return <MembersTab projectId={projectId} isOwner={isOwner} />;
  }

  if (activeTab === "settings") {
    return (
      <SettingsTab project={project} projectId={projectId} isOwner={isOwner} canEdit={canEdit} />
    );
  }

  return <OverviewTab project={project} projectId={projectId} memberCount={memberCount} />;
}
