"use client";

import type { ReactElement } from "react";
import { Chip, Stack, Typography } from "@mui/material";
import type { EnvironmentItem } from "@/types/api/environment";

interface EnvironmentSelectorProps {
  environments: EnvironmentItem[];
  selected: string | null;
  onSelect: (name: string) => void;
}

export function EnvironmentSelector(props: EnvironmentSelectorProps): ReactElement {
  const { environments, selected, onSelect } = props;

  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
      <Typography variant="body2" color="text.secondary" sx={{ mr: 0.5 }}>
        Environment:
      </Typography>
      {environments.map((env) => (
        <Chip
          key={env.id}
          label={`${env.name} (${env.variableCount})`}
          variant={selected === env.name ? "filled" : "outlined"}
          color={selected === env.name ? "primary" : "default"}
          onClick={() => onSelect(env.name)}
          size="small"
        />
      ))}
    </Stack>
  );
}
