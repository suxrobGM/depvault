"use client";

import type { ReactElement } from "react";
import { FolderOpen as FilesIcon, VpnKey as VpnKeyIcon } from "@mui/icons-material";
import { Tab, Tabs } from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/lib/constants";

interface VaultTabsProps {
  projectId: string;
}

const TABS = [
  {
    label: "Variables",
    icon: <VpnKeyIcon />,
    route: (id: string) => ROUTES.projectVaultVariables(id),
    segment: "variables",
  },
  {
    label: "Secret Files",
    icon: <FilesIcon />,
    route: (id: string) => ROUTES.projectVaultSecretFiles(id),
    segment: "secret-files",
  },
] as const;

export function VaultTabs(props: VaultTabsProps): ReactElement {
  const { projectId } = props;
  const pathname = usePathname();

  const activeIndex = TABS.findIndex((t) => pathname.endsWith(`/${t.segment}`));

  return (
    <Tabs
      value={activeIndex === -1 ? 0 : activeIndex}
      sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
    >
      {TABS.map((tab) => (
        <Tab
          key={tab.segment}
          component={Link}
          href={tab.route(projectId)}
          icon={tab.icon}
          iconPosition="start"
          label={tab.label}
        />
      ))}
    </Tabs>
  );
}
