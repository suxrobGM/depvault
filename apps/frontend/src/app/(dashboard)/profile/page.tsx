import type { ReactElement } from "react";
import { Box } from "@mui/material";
import { ProfileTabPanel } from "@/components/features/profile/profile-tab-panel";
import { ProfileTabs } from "@/components/features/profile/profile-tabs";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/lib/constants";

const VALID_TABS = ["general", "security"] as const;
type ProfileTab = (typeof VALID_TABS)[number];

interface ProfilePageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function ProfilePage(props: ProfilePageProps): Promise<ReactElement> {
  const searchParams = await props.searchParams;
  const tab: ProfileTab = VALID_TABS.includes(searchParams.tab as ProfileTab)
    ? (searchParams.tab as ProfileTab)
    : "general";

  return (
    <Box>
      <PageHeader
        title="Profile"
        subtitle="Manage your account settings and preferences"
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.dashboard }, { label: "Profile" }]}
      />
      <ProfileTabs activeTab={tab} />
      <ProfileTabPanel activeTab={tab} />
    </Box>
  );
}
