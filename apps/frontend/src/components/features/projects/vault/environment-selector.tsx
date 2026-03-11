"use client";

import type { ReactElement } from "react";
import { getEnvironmentLabel } from "@depvault/shared/constants";
import { Chip, Stack, Typography } from "@mui/material";
import type { EnvironmentItem } from "@/types/api/environment";

interface EnvironmentSelectorProps {
  environments: EnvironmentItem[];
  selected: string | null;
  onSelect: (type: string) => void;
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
          label={`${getEnvironmentLabel(env.type)} (${env.variableCount})`}
          variant={selected === env.type ? "filled" : "outlined"}
          color={selected === env.type ? "primary" : "default"}
          onClick={() => onSelect(env.type)}
          size="small"
        />
      ))}
    </Stack>
  );
}
