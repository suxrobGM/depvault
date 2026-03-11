"use client";

import { useState, type ReactElement } from "react";
import { ArrowBack as BackIcon } from "@mui/icons-material";
import { Box, Button, Skeleton, Stack, Typography } from "@mui/material";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import type { EnvDiffResponse, EnvironmentItem } from "@/types/api/environment";
import { DiffEnvironmentPicker } from "./diff-environment-picker";
import { DiffTable } from "./diff-table";

interface EnvDiffViewProps {
  projectId: string;
  vaultGroupId: string;
  environments: EnvironmentItem[];
  onBack: () => void;
}

export function EnvDiffView(props: EnvDiffViewProps): ReactElement {
  const { projectId, vaultGroupId, environments, onBack } = props;
  const [selected, setSelected] = useState<string[]>([]);

  const canDiff = selected.length >= 2 && selected.length <= 3;

  const { data, isLoading } = useApiQuery<EnvDiffResponse>(
    ["env-diff", projectId, ...selected],
    () =>
      client.api.projects({ id: projectId }).environments.diff.get({
        query: { environments: selected.join(","), vaultGroupId },
      }),
    { enabled: canDiff },
  );

  return (
    <Box>
      <Stack spacing={3}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Button startIcon={<BackIcon />} onClick={onBack} size="small">
            Variables
          </Button>
          <Typography variant="subtitle1" fontWeight={600}>
            Compare Environments
          </Typography>
        </Stack>

        <DiffEnvironmentPicker
          environments={environments}
          selected={selected}
          onChange={setSelected}
        />

        {isLoading && canDiff && (
          <Stack spacing={1}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rounded" height={48} />
            ))}
          </Stack>
        )}

        {data && <DiffTable environments={data.environments} rows={data.rows} />}
      </Stack>
    </Box>
  );
}
