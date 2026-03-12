import type { ReactElement, ReactNode } from "react";
import { Box } from "@mui/material";
import { ProfileTabs } from "@/components/features/profile/profile-tabs";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/lib/constants";

interface ProfileTabsLayoutProps {
  children: ReactNode;
}

export default function ProfileTabsLayout(props: ProfileTabsLayoutProps): ReactElement {
  const { children } = props;

  return (
    <Box>
      <PageHeader
        title="Profile"
        subtitle="Manage your account settings and preferences"
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.dashboard }, { label: "Profile" }]}
      />
      <ProfileTabs />
      {children}
    </Box>
  );
}
