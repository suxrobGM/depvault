import type { ReactElement } from "react";
import { Box } from "@mui/material";
import { UsersTable } from "@/components/features/admin";
import { PageHeader } from "@/components/ui/containers";
import { ROUTES } from "@/lib/constants";

export default function AdminUsersPage(): ReactElement {
  return (
    <Box>
      <PageHeader
        title="Users"
        subtitle="Manage platform users and their subscriptions"
        breadcrumbs={[{ label: "Admin", href: ROUTES.admin }, { label: "Users" }]}
      />
      <UsersTable />
    </Box>
  );
}
