"use client";

import type { ReactElement } from "react";
import { Box } from "@mui/material";
import { useAuth } from "@/hooks/use-auth";
import { GeneralTab } from "./general-tab";

export function GeneralTabWrapper(): ReactElement {
  const { user, setUser } = useAuth();

  if (!user) return <Box />;

  return <GeneralTab user={user} setUser={setUser} />;
}
