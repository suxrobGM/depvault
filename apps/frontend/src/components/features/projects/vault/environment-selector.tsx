"use client";

import type { ReactElement } from "react";
import { getEnvironmentLabel } from "@depvault/shared/constants";
import { Chip, Stack, Typography } from "@mui/material";
import type { EnvironmentItem } from "@/types/api/environment";

interface EnvironmentSelectorProps {
  environments: EnvironmentItem[];
  selected: string | null;
  onSelect: (type: string) => void;
  onDelete?: (envId: string, envType: string) => void;
}

export function EnvironmentSelector(props: EnvironmentSelectorProps): ReactElement {
  const { environments, selected, onSelect, onDelete } = props;

  return (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      sx={{
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          mr: 0.5,
        }}
      >
        Environment:
      </Typography>
      {environments.map((env) => (
        <Chip
          key={env.id}
          label={`${getEnvironmentLabel(env.type)} (${env.variableCount})`}
          variant={selected === env.type ? "filled" : "outlined"}
          color={selected === env.type ? "primary" : "default"}
          onClick={() => onSelect(env.type)}
          onDelete={onDelete ? () => onDelete(env.id, env.type) : undefined}
          size="small"
        />
      ))}
    </Stack>
  );
}
