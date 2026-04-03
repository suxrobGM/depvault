import type { ReactElement } from "react";
import { Command, Option } from "clipanion";
import { Box } from "ink";
import { getApiClient } from "@/services/api-client";
import { AuthMode, getAuthMode } from "@/services/auth";
import { updateConfig } from "@/services/config";
import { ErrorBox } from "@/ui/error-box";
import { KeyValue } from "@/ui/key-value";
import { Success } from "@/ui/success";
import { getFlag, getPositional, hasFlag } from "@/utils/args";
import { renderResult } from "@/utils/render";

export default async function handler(args: string[]): Promise<ReactElement> {
  if (getAuthMode() === AuthMode.None) {
    return <ErrorBox message="Not authenticated. Run /login first." />;
  }

  const name = getPositional(args);
  if (!name) {
    return <ErrorBox message="Usage: /project create <name> [--description=...] [--repo=...]" />;
  }

  const description = getFlag(args, "description");
  const repositoryUrl = getFlag(args, "repo");
  const setActive = !hasFlag(args, "no-set-active");

  const client = getApiClient();
  const { data: project, error } = await client.api.projects.post({
    name,
    description: description ?? undefined,
    repositoryUrl: repositoryUrl ?? undefined,
  });

  if (error || !project) {
    return <ErrorBox message="Failed to create project." />;
  }

  if (setActive) {
    updateConfig({ activeProjectId: project.id, activeProjectName: project.name });
  }

  return (
    <Box flexDirection="column">
      <Success message={`Project "${project.name}" created.`} />
      <KeyValue label="ID" value={project.id} />
      {setActive && <Success message="Set as active project." />}
    </Box>
  );
}

export class ProjectCreateCommand extends Command {
  static override paths = [["project", "create"]];
  static override usage = Command.Usage({ description: "Create a new project" });

  name = Option.String({ required: true });
  description = Option.String("--description,-d", { required: false });
  repo = Option.String("--repo", { required: false });

  async execute(): Promise<void> {
    const args = [this.name];
    if (this.description) args.push(`--description=${this.description}`);
    if (this.repo) args.push(`--repo=${this.repo}`);
    await renderResult(this.context.stdout, handler, args);
  }
}
