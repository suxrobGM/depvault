"use client";

import type { ReactElement, SyntheticEvent } from "react";
import {
  Group as GroupIcon,
  Info as InfoIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
  VpnKey as VpnKeyIcon,
} from "@mui/icons-material";
import { Tab, Tabs } from "@mui/material";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants";

interface ProjectTabsProps {
  activeTab: "overview" | "analysis" | "vault" | "members" | "settings";
  projectId: string;
}

const TAB_MAP = ["overview", "analysis", "vault", "members", "settings"] as const;

export function ProjectTabs(props: ProjectTabsProps): ReactElement {
  const { activeTab, projectId } = props;
  const router = useRouter();

  const handleTabChange = (_: SyntheticEvent, newValue: number) => {
    const tab = TAB_MAP[newValue];
    router.push(`${ROUTES.project(projectId)}?tab=${tab}` as Route);
  };

  return (
    <Tabs
      value={TAB_MAP.indexOf(activeTab)}
      onChange={handleTabChange}
      className="vault-fade-up vault-delay-1"
      sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
    >
      <Tab icon={<InfoIcon />} iconPosition="start" label="Overview" />
      <Tab icon={<SecurityIcon />} iconPosition="start" label="Analysis" />
      <Tab icon={<VpnKeyIcon />} iconPosition="start" label="Vault" />
      <Tab icon={<GroupIcon />} iconPosition="start" label="Members" />
      <Tab icon={<SettingsIcon />} iconPosition="start" label="Settings" />
    </Tabs>
  );
}
