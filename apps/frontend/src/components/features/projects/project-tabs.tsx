"use client";

import type { ReactElement } from "react";
import {
  Group as GroupIcon,
  History as HistoryIcon,
  Info as InfoIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { Tabs } from "@mui/material";
import { usePathname } from "next/navigation";
import { LinkTab } from "@/components/ui/inputs";
import { ROUTES } from "@/lib/constants";

interface ProjectTabsProps {
  projectId: string;
}

const TABS = [
  {
    label: "Overview",
    icon: <InfoIcon />,
    route: (id: string) => ROUTES.projectOverview(id),
    segment: "overview",
  },
  {
    label: "Members",
    icon: <GroupIcon />,
    route: (id: string) => ROUTES.projectMembers(id),
    segment: "members",
  },
  {
    label: "Activity",
    icon: <HistoryIcon />,
    route: (id: string) => ROUTES.projectActivity(id),
    segment: "activity",
  },
  {
    label: "Settings",
    icon: <SettingsIcon />,
    route: (id: string) => ROUTES.projectSettings(id),
    segment: "settings",
  },
] as const;

export function ProjectTabs(props: ProjectTabsProps): ReactElement {
  const { projectId } = props;
  const pathname = usePathname();

  const activeIndex = TABS.findIndex((t) => pathname.endsWith(`/${t.segment}`));

  return (
    <Tabs
      value={activeIndex === -1 ? 0 : activeIndex}
      className="vault-fade-up vault-delay-1"
      sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
    >
      {TABS.map((tab) => (
        <LinkTab
          key={tab.segment}
          href={tab.route(projectId)}
          icon={tab.icon}
          iconPosition="start"
          label={tab.label}
        />
      ))}
    </Tabs>
  );
}
