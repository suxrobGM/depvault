"use client";

import type { ReactElement } from "react";
import {
  ContentCopy as CloneIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Share as ShareIcon,
  Upload as UploadIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { GlassCard } from "@/components/ui/glass-card";
import type { AuditLogEntry } from "@/types/api/audit-log";
import { formatRelativeTime } from "@/utils/formatters";

interface ActivityLogEntryProps {
  entry: AuditLogEntry;
  index: number;
}

interface ActionConfig {
  icon: ReactElement;
  color: string;
  verb: string;
}

const ACTION_CONFIG: Record<string, ActionConfig> = {
  READ: { icon: <ViewIcon fontSize="small" />, color: "info.main", verb: "viewed" },
  UPDATE: { icon: <EditIcon fontSize="small" />, color: "warning.main", verb: "updated" },
  DELETE: { icon: <DeleteIcon fontSize="small" />, color: "error.main", verb: "deleted" },
  DOWNLOAD: { icon: <DownloadIcon fontSize="small" />, color: "success.main", verb: "downloaded" },
  SHARE: { icon: <ShareIcon fontSize="small" />, color: "secondary.main", verb: "shared" },
  UPLOAD: { icon: <UploadIcon fontSize="small" />, color: "primary.main", verb: "uploaded" },
  CLONE: { icon: <CloneIcon fontSize="small" />, color: "info.light", verb: "cloned" },
};

const RESOURCE_LABELS: Record<string, string> = {
  ENV_VARIABLE: "Env Variable",
  ENV_TEMPLATE: "Env Template",
  SECRET_FILE: "Secret File",
  SHARE_LINK: "Share Link",
};

function getMetadataDetail(metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null;
  if (typeof metadata.key === "string") return metadata.key;
  if (typeof metadata.fileName === "string") return metadata.fileName;
  if (typeof metadata.name === "string") return metadata.name;
  return null;
}

const VALID_COLOR_KEYS = ["info", "warning", "error", "success", "secondary", "primary"] as const;
type PaletteColorKey = (typeof VALID_COLOR_KEYS)[number];

function getColorKey(color: string): PaletteColorKey {
  const key = color.split(".")[0];
  return VALID_COLOR_KEYS.includes(key as PaletteColorKey) ? (key as PaletteColorKey) : "info";
}

export function ActivityLogEntry(props: ActivityLogEntryProps): ReactElement {
  const { entry, index } = props;
  const config = ACTION_CONFIG[entry.action] ?? ACTION_CONFIG.READ!;
  const resourceLabel = RESOURCE_LABELS[entry.resourceType] ?? entry.resourceType;
  const metadataDetail = getMetadataDetail(entry.metadata as Record<string, unknown> | null);
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
            bgcolor: (t) => alpha(t.palette[getColorKey(config.color)].main, 0.12),
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
              {config.verb}
            </Typography>{" "}
            {resourceLabel}
            {metadataDetail && (
              <>
                {" "}
                <Typography component="span" variant="body2" fontWeight={600}>
                  {metadataDetail}
                </Typography>
              </>
            )}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatRelativeTime(new Date(entry.createdAt))} · {entry.ipAddress}
          </Typography>
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
