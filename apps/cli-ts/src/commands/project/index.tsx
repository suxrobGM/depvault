import { createElement, type ReactElement } from "react";
import { Select } from "@inkjs/ui";
import { Box, render, Text } from "ink";
import { getApiClient } from "@/services/api-client";
import { AuthMode, getAuthMode } from "@/services/auth";
import { loadConfig, updateConfig } from "@/services/config";
import { ErrorBox } from "@/ui/error-box";
import { Success } from "@/ui/success";
import { colors } from "@/ui/theme";

interface ProjectChoice {
  label: string;
  value: string;
  name: string;
}

interface ProjectSelectorProps {
  choices: ProjectChoice[];
  onSelect: (value: string) => void;
}

function ProjectSelector(props: ProjectSelectorProps): ReactElement {
  const { choices, onSelect } = props;
  return (
    <Box flexDirection="column">
      <Text color={colors.highlight}>Select active project:</Text>
      <Select options={choices} onChange={onSelect} />
    </Box>
  );
}

export default async function handler(_args: string[]): Promise<ReactElement> {
  if (getAuthMode() === AuthMode.None) {
    return <ErrorBox message="Not authenticated. Run /login first." />;
  }

  const client = getApiClient();
  const { data, error } = await client.api.projects.get({ query: { page: 1, limit: 100 } });

  if (error || !data) {
    return <ErrorBox message="Failed to load projects." />;
  }

  const items = data.items ?? [];

  if (items.length === 0) {
    return <Text>No projects found. Create one with /project create.</Text>;
  }

  const config = loadConfig();

  const choices: ProjectChoice[] = items.map((p) => ({
    label: `${p.name}${p.id === config.activeProjectId ? " *" : ""}`,
    value: p.id,
    name: p.name,
  }));

  return new Promise<ReactElement>((resolve) => {
    const { unmount } = render(
      createElement(ProjectSelector, {
        choices,
        onSelect: (value: string) => {
          unmount();
          const selected = items.find((p) => p.id === value);
          if (selected) {
            updateConfig({ activeProjectId: selected.id, activeProjectName: selected.name });
            resolve(
              <Success message={`Active project set to ${selected.name} (${selected.id})`} />,
            );
          } else {
            resolve(<ErrorBox message="Selection failed." />);
          }
        },
      }),
    );
  });
}
