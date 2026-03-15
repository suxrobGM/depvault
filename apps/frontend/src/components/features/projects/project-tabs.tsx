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
  currentUserRole: string;
}

const TABS = [
  {
    label: "Overview",
    icon: <InfoIcon />,
    route: (id: string) => ROUTES.projectOverview(id),
    segment: "overview",
    minRole: "VIEWER" as const,
  },
  {
    label: "Members",
    icon: <GroupIcon />,
    route: (id: string) => ROUTES.projectMembers(id),
    segment: "members",
    minRole: "VIEWER" as const,
  },
  {
    label: "Activity",
    icon: <HistoryIcon />,
    route: (id: string) => ROUTES.projectActivity(id),
    segment: "activity",
    minRole: "EDITOR" as const,
  },
  {
    label: "Settings",
    icon: <SettingsIcon />,
    route: (id: string) => ROUTES.projectSettings(id),
    segment: "settings",
    minRole: "OWNER" as const,
  },
] as const;

const ROLE_LEVEL = { VIEWER: 0, EDITOR: 1, OWNER: 2 } as const;

export function ProjectTabs(props: ProjectTabsProps): ReactElement {
  const { projectId, currentUserRole } = props;
  const pathname = usePathname();

  const userLevel = ROLE_LEVEL[currentUserRole as keyof typeof ROLE_LEVEL] ?? 0;
  const visibleTabs = TABS.filter((tab) => userLevel >= ROLE_LEVEL[tab.minRole]);
  const activeIndex = visibleTabs.findIndex((t) => pathname.endsWith(`/${t.segment}`));

  return (
    <Tabs
      value={activeIndex === -1 ? 0 : activeIndex}
      className="vault-fade-up vault-delay-1"
      sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
    >
      {visibleTabs.map((tab) => (
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
