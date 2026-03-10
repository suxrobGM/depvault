"use client";

import type { ReactElement } from "react";
import { Box } from "@mui/material";
import { useAuth } from "@/hooks/use-auth";
import { GeneralTab } from "./general-tab";
import { SecurityTab } from "./security-tab";

interface ProfileTabPanelProps {
  activeTab: "general" | "security";
}

export function ProfileTabPanel(props: ProfileTabPanelProps): ReactElement {
  const { activeTab } = props;
  const { user, setUser } = useAuth();

  if (!user) {
    return <Box />;
  }

  if (activeTab === "security") {
    return <SecurityTab user={user} setUser={setUser} />;
  }

  return <GeneralTab user={user} setUser={setUser} />;
}
