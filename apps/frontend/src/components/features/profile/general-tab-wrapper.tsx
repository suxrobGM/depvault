"use client";

import type { ReactElement } from "react";
import { LoadingSpinner } from "@/components/ui/feedback";
import { useAuth } from "@/hooks/use-auth";
import { GeneralTab } from "./general-tab";

export function GeneralTabWrapper(): ReactElement {
  const { user, setUser } = useAuth();

  if (!user) {
    return <LoadingSpinner />;
  }

  return <GeneralTab user={user} setUser={setUser} />;
}
