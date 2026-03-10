"use client";

import type { ReactElement, SyntheticEvent } from "react";
import { Person as PersonIcon, Security as SecurityIcon } from "@mui/icons-material";
import { Tab, Tabs } from "@mui/material";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants";

interface ProfileTabsProps {
  activeTab: "general" | "security";
}

const TAB_MAP = ["general", "security"] as const;

export function ProfileTabs(props: ProfileTabsProps): ReactElement {
  const { activeTab } = props;
  const router = useRouter();

  const handleTabChange = (_: SyntheticEvent, newValue: number) => {
    const tab = TAB_MAP[newValue];
    router.push(`${ROUTES.profile}?tab=${tab}`);
  };

  return (
    <Tabs
      value={TAB_MAP.indexOf(activeTab)}
      onChange={handleTabChange}
      className="vault-fade-up vault-delay-1"
      sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
    >
      <Tab icon={<PersonIcon />} iconPosition="start" label="General" />
      <Tab icon={<SecurityIcon />} iconPosition="start" label="Security" />
    </Tabs>
  );
}
