import type { ReactElement } from "react";
import { Box } from "@mui/material";
import { RepoBrowser } from "@/components/features/projects/repo";
import { VaultGate } from "@/components/features/vault";
import { PageHeader } from "@/components/ui/containers";
import { getServerClient } from "@/lib/api-server";
import { ROUTES } from "@/lib/constants";

interface PageProps {
  params: Promise<{ id: string }>;
}

/** Repository browser page: SSR header + vault unlock gate + the app/file browser. */
export default async function ProjectVaultPage(props: PageProps): Promise<ReactElement> {
  const { id } = await props.params;

  const client = await getServerClient();
  const { data: project } = await client.api.projects({ id }).get();

  return (
    <Box>
      <PageHeader
        title="Vault"
        subtitle={project ? `Encrypted config & secret files for ${project.name}` : undefined}
        breadcrumbs={[
          { label: "Overview", href: ROUTES.overview },
          { label: "Projects", href: ROUTES.projects },
          { label: project?.name ?? "...", href: ROUTES.project(id) },
          { label: "Vault" },
        ]}
      />
      <VaultGate>
        <RepoBrowser projectId={id} />
      </VaultGate>
    </Box>
  );
}
