"use client";

import type { ReactElement } from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { UserAvatar } from "@/components/ui/data-display";
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
  isLast: boolean;
}

export function ActivityLogEntry(props: ActivityLogEntryProps): ReactElement {
  const { entry, index, isLast } = props;

  const config = ACTIVITY_ACTION_CONFIG[entry.action] ?? ACTIVITY_ACTION_CONFIG.READ!;
  const resourceLabel = RESOURCE_LABELS[entry.resourceType] ?? entry.resourceType;
  const paletteKey = getActivityColor(config.color);

  const meta = entry.metadata as Record<string, unknown> | null;
  const desc = generateActivityDescription(entry.action, entry.resourceType, meta);
  const delayClass = index < 8 ? `vault-delay-${index + 1}` : "vault-delay-8";

  const userName =
    entry.userFirstName && entry.userLastName
      ? `${entry.userFirstName} ${entry.userLastName}`
      : (entry.userEmail ?? "System");

  return (
    <Box
      className={`vault-fade-up ${delayClass}`}
      sx={{ display: "flex", position: "relative", minHeight: 56 }}
    >
      {/* Timeline connector line */}
      {!isLast && (
        <Box
          sx={{
            position: "absolute",
            left: 15,
            top: 36,
            bottom: -4,
            width: 2,
            bgcolor: "divider",
          }}
        />
      )}

      {/* Action icon */}
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: (t) => alpha(t.palette[paletteKey].main, 0.12),
          color: config.color,
          flexShrink: 0,
          zIndex: 1,
          border: 2,
          borderColor: "background.default",
          "& .MuiSvgIcon-root": { fontSize: 16 },
        }}
      >
        {config.icon}
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, ml: 1.5, pb: isLast ? 0 : 3, minWidth: 0 }}>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ flexWrap: "wrap", rowGap: 0.5 }}
        >
          <UserAvatar
            firstName={entry.userFirstName}
            lastName={entry.userLastName}
            email={entry.userEmail}
            avatarUrl={entry.userAvatarUrl}
            size={20}
          />
          <Typography
            variant="body2"
            fontWeight={600}
            component="span"
            noWrap
            sx={{ flexShrink: 0 }}
          >
            {userName}
          </Typography>
          <Typography variant="body2" color="text.secondary" component="span">
            {desc.summary}
          </Typography>
          {desc.highlight && (
            <Chip
              label={desc.highlight}
              size="small"
              sx={{
                height: 22,
                fontSize: "0.75rem",
                fontFamily: "monospace",
                bgcolor: (t) => alpha(t.palette[paletteKey].main, 0.08),
                color: config.color,
              }}
            />
          )}
          <Chip
            label={resourceLabel}
            size="small"
            variant="outlined"
            sx={{ height: 20, fontSize: "0.675rem" }}
          />
        </Stack>

        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25 }}>
          <Typography variant="caption" color="text.disabled">
            {formatRelativeTime(new Date(entry.createdAt))}
          </Typography>
          {desc.detail && (
            <Typography variant="caption" color="text.disabled">
              · {desc.detail}
            </Typography>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
