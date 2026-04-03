import type { ReactElement } from "react";
import { Command, Option } from "clipanion";
import { getApiClient } from "@/services/api-client";
import { AuthMode, getAuthMode } from "@/services/auth";
import { updateConfig } from "@/services/config";
import { ErrorBox } from "@/ui/error-box";
import { Success } from "@/ui/success";
import { renderResult } from "@/utils/render";

export default async function handler(args: string[]): Promise<ReactElement> {
  if (getAuthMode() === AuthMode.None) {
    return <ErrorBox message="Not authenticated. Run /login first." />;
  }

  const projectId = args[0];
  if (!projectId) {
    return <ErrorBox message="Usage: /project select <id>" />;
  }

  const client = getApiClient();
  const { data: project, error } = await client.api.projects({ id: projectId }).get();

  if (error || !project) {
    return <ErrorBox message={`Project "${projectId}" not found.`} />;
  }

  updateConfig({ activeProjectId: project.id, activeProjectName: project.name });
  return <Success message={`Active project set to ${project.name} (${project.id})`} />;
}

export class ProjectSelectCommand extends Command {
  static override paths = [["project", "select"]];
  static override usage = Command.Usage({ description: "Set the active project" });

  id = Option.String({ required: true });

  async execute(): Promise<void> {
    await renderResult(this.context.stdout, handler, [this.id]);
  }
}
