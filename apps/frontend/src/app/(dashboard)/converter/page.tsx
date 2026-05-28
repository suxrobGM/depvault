import type { ReactElement } from "react";
import { Box } from "@mui/material";
import { ConverterView } from "@/components/features/dashboard/converter/converter-view";
import { PageHeader } from "@/components/ui/containers";
import { ROUTES } from "@/lib/constants";

export default function ConverterPage(): ReactElement {
  return (
    <Box>
      <PageHeader
        title="Config Converter"
        subtitle="Convert between .env, appsettings.json, secrets.yaml, and config.toml"
        breadcrumbs={[{ label: "Overview", href: ROUTES.overview }, { label: "Converter" }]}
      />
      <ConverterView />
    </Box>
  );
}
