import type { ReactElement } from "react";
import { Box } from "@mui/material";
import { CreateProjectButton } from "@/components/features/projects/create-project-button";
import { ProjectList } from "@/components/features/projects/project-list";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/lib/constants";

export default function ProjectsPage(): ReactElement {
  return (
    <Box>
      <PageHeader
        title="Projects"
        subtitle="Manage your projects and team collaboration"
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.dashboard }, { label: "Projects" }]}
        actions={<CreateProjectButton />}
      />
      <ProjectList />
    </Box>
  );
}
