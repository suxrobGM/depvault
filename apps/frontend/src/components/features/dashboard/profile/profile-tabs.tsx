"use client";

import type { ReactElement, SyntheticEvent } from "react";
import { Person as PersonIcon, Security as SecurityIcon } from "@mui/icons-material";
import { Tab, Tabs } from "@mui/material";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants";

const TAB_ROUTES = [ROUTES.profileGeneral, ROUTES.profileSecurity] as const;

export function ProfileTabs(): ReactElement {
  const router = useRouter();
  const pathname = usePathname();

  const activeIndex = TAB_ROUTES.findIndex((route) => pathname === route);

  const handleTabChange = (_: SyntheticEvent, newValue: number) => {
    router.push(TAB_ROUTES[newValue]! as Route);
  };

  return (
    <Tabs
      value={activeIndex >= 0 ? activeIndex : 0}
      onChange={handleTabChange}
      className="vault-fade-up vault-delay-1"
      sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
    >
      <Tab icon={<PersonIcon />} iconPosition="start" label="General" />
      <Tab icon={<SecurityIcon />} iconPosition="start" label="Security" />
    </Tabs>
  );
}
