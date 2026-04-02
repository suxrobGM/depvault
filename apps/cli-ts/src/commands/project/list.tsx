import type { ReactElement } from "react";
import { Box, Text } from "ink";
import { getApiClient } from "@/services/api-client";
import { AuthMode, getAuthMode } from "@/services/auth";
import { ErrorBox } from "@/ui/error-box";
import { Table } from "@/ui/table";
import { getFlag } from "@/utils/args";

export default async function handler(args: string[]): Promise<ReactElement> {
  if (getAuthMode() === AuthMode.None) {
    return <ErrorBox message="Not authenticated. Run /login first." />;
  }

  const outputFormat = getFlag(args, "output") ?? "table";
  const client = getApiClient();
  const { data, error } = await client.api.projects.get({ query: { page: 1, limit: 100 } });

  if (error || !data) {
    return <ErrorBox message="Failed to load projects." />;
  }

  const items = data.items ?? [];

  if (items.length === 0) {
    return <Text>No projects found. Create one with /project create.</Text>;
  }

  if (outputFormat === "json") {
    return <Text>{JSON.stringify(items, null, 2)}</Text>;
  }

  return (
    <Table
      headers={["Name", "ID", "Role", "Created"]}
      rows={items.map((p) => [
        p.name,
        p.id,
        p.currentUserRole ?? "",
        new Date(p.createdAt as unknown as string).toLocaleDateString(),
      ])}
    />
  );
}
