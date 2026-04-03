import type { ReactElement } from "react";
import { Command, Option } from "clipanion";
import { Box } from "ink";
import { getApiClient } from "@/services/api-client";
import { AuthMode, getAuthMode } from "@/services/auth";
import { loadConfig } from "@/services/config";
import { ErrorBox } from "@/ui/error-box";
import { KeyValue } from "@/ui/key-value";
import { getFlag } from "@/utils/args";
import { renderResult } from "@/utils/render";

export default async function handler(args: string[]): Promise<ReactElement> {
  if (getAuthMode() === AuthMode.None) {
    return <ErrorBox message="Not authenticated. Run /login first." />;
  }

  const projectId = getFlag(args, "project") ?? loadConfig().activeProjectId;

  if (!projectId) {
    return <ErrorBox message="No active project. Use /project select or --project=<id>." />;
  }

  const client = getApiClient();
  const { data: project, error } = await client.api.projects({ id: projectId }).get();

  if (error || !project) {
    return <ErrorBox message={`Failed to load project ${projectId}.`} />;
  }

  return (
    <Box flexDirection="column">
      <KeyValue label="Name" value={project.name} />
      <KeyValue label="ID" value={project.id} />
      <KeyValue label="Role" value={project.currentUserRole ?? "—"} />
      {project.description && <KeyValue label="Description" value={project.description} />}
      {project.repositoryUrl && <KeyValue label="Repository" value={project.repositoryUrl} />}
      <KeyValue
        label="Created"
        value={new Date(project.createdAt as unknown as string).toLocaleDateString()}
      />
    </Box>
  );
}

export class ProjectInfoCommand extends Command {
  static override paths = [["project", "info"]];
  static override usage = Command.Usage({ description: "Show project details" });

  project = Option.String("--project", { required: false });

  async execute(): Promise<void> {
    const args = this.project ? [`--project=${this.project}`] : [];
    await renderResult(this.context.stdout, handler, args);
  }
}
