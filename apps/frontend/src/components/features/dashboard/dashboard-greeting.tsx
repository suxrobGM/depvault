"use client";

import type { ReactElement } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/hooks/use-auth";

export function DashboardGreeting(): ReactElement {
  const { user } = useAuth();
  const greeting = user?.username ? `Welcome back, ${user.username}` : "Welcome to DepVault";

  return <PageHeader title={greeting} subtitle="Manage your projects, dependencies, and secrets" />;
}
