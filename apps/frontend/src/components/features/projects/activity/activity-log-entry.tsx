"use client";

import type { ReactElement } from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { GlassCard } from "@/components/ui/glass-card";
import type { AuditLogEntry } from "@/types/api/audit-log";
import { formatRelativeTime } from "@/utils/formatters";
import {
  ACTIVITY_ACTION_CONFIG,
  generateActivityDescription,
  getActivityColor,
  RESOURCE_LABELS,
} from "./utils";

interface ActivityLogEntryProps {
  entry: AuditLogEntry;
  index: number;
}

export function ActivityLogEntry(props: ActivityLogEntryProps): ReactElement {
  const { entry, index } = props;

  const config = ACTIVITY_ACTION_CONFIG[entry.action] ?? ACTIVITY_ACTION_CONFIG.READ!;
  const resourceLabel = RESOURCE_LABELS[entry.resourceType] ?? entry.resourceType;

  const meta = entry.metadata as Record<string, unknown> | null;
  const desc = generateActivityDescription(entry.action, entry.resourceType, meta);
  const delayClass = index < 8 ? `vault-delay-${index + 1}` : "vault-delay-8";

  return (
    <GlassCard className={`vault-fade-up ${delayClass}`} hoverGlow={false}>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ px: 3, py: 2 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: (t) => alpha(t.palette[getActivityColor(config.color)].main, 0.12),
            color: config.color,
            flexShrink: 0,
          }}
        >
          {config.icon}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={500} noWrap>
            {entry.userEmail ?? "System"}{" "}
            <Typography component="span" variant="body2" color="text.secondary">
              {desc.summary}
            </Typography>
            {desc.highlight && (
              <>
                {" "}
                <Typography component="span" variant="body2" fontWeight={600}>
                  {desc.highlight}
                </Typography>
              </>
            )}
          </Typography>

          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="caption" color="text.secondary">
              {formatRelativeTime(new Date(entry.createdAt))} · {entry.ipAddress}
            </Typography>
            {desc.detail && (
              <Typography variant="caption" color="text.disabled">
                · {desc.detail}
              </Typography>
            )}
          </Stack>
        </Box>

        <Chip
          label={resourceLabel}
          size="small"
          variant="outlined"
          sx={{ flexShrink: 0, height: 24, fontSize: "0.7rem" }}
        />
      </Stack>
    </GlassCard>
  );
}
