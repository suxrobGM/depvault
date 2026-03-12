"use client";

import type { ReactElement } from "react";
import { Box } from "@mui/material";
import { useAuth } from "@/hooks/use-auth";
import { SecurityTab } from "./security-tab";

export function SecurityTabWrapper(): ReactElement {
  const { user, setUser } = useAuth();

  if (!user) return <Box />;

  return <SecurityTab user={user} setUser={setUser} />;
}
