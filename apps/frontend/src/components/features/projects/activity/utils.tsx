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

interface ActionConfig {
  icon: ReactElement;
  color: string;
  verb: string;
}

interface Description {
  summary: string;
  highlight: string | null;
  detail: string | null;
}

export const ACTIVITY_ACTION_CONFIG: Record<string, ActionConfig> = {
  READ: { icon: <ViewIcon fontSize="small" />, color: "info.main", verb: "viewed" },
  UPDATE: { icon: <EditIcon fontSize="small" />, color: "warning.main", verb: "updated" },
  DELETE: { icon: <DeleteIcon fontSize="small" />, color: "error.main", verb: "deleted" },
  DOWNLOAD: { icon: <DownloadIcon fontSize="small" />, color: "success.main", verb: "downloaded" },
  SHARE: { icon: <ShareIcon fontSize="small" />, color: "secondary.main", verb: "shared" },
  UPLOAD: { icon: <UploadIcon fontSize="small" />, color: "primary.main", verb: "uploaded" },
  CLONE: { icon: <CloneIcon fontSize="small" />, color: "info.light", verb: "cloned" },
};

export const RESOURCE_LABELS: Record<string, string> = {
  ENV_VARIABLE: "Env Variable",
  ENV_TEMPLATE: "Env Template",
  SECRET_FILE: "Secret File",
  SHARE_LINK: "Share Link",
};

const VALID_COLOR_KEYS = ["info", "warning", "error", "success", "secondary", "primary"] as const;
type PaletteColorKey = (typeof VALID_COLOR_KEYS)[number];

export function getActivityColor(color: string): PaletteColorKey {
  const key = color.split(".")[0];
  return VALID_COLOR_KEYS.includes(key as PaletteColorKey) ? (key as PaletteColorKey) : "info";
}

function formatEnvType(type: unknown): string {
  if (typeof type !== "string" || !type) return "";
  return type.charAt(0) + type.slice(1).toLowerCase();
}

/** Join non-empty detail segments with " · ". */
function joinDetail(...parts: (string | null | undefined | false)[]): string | null {
  const filtered = parts.filter(Boolean) as string[];
  return filtered.length > 0 ? filtered.join(" · ") : null;
}

export function generateActivityDescription(
  action: string,
  resourceType: string,
  meta: Record<string, unknown> | null,
): Description {
  const verb = ACTIVITY_ACTION_CONFIG[action]?.verb ?? action.toLowerCase();
  const fallback: Description = {
    summary: `${verb} ${(RESOURCE_LABELS[resourceType] ?? resourceType).toLowerCase()}`,
    highlight: null,
    detail: null,
  };

  if (!meta) return fallback;

  const group = typeof meta.vaultGroupName === "string" ? meta.vaultGroupName : null;

  if (resourceType === "ENV_VARIABLE") {
    if (action === "READ" && typeof meta.count === "number") {
      const env = formatEnvType(meta.environmentType);
      return {
        summary: `viewed ${meta.count} variables`,
        highlight: null,
        detail: joinDetail(group, env),
      };
    }
    if (action === "UPLOAD" && typeof meta.imported === "number") {
      return {
        summary: `imported ${meta.imported} variables`,
        highlight: meta.skipped ? `${meta.skipped} skipped` : null,
        detail: joinDetail(group, typeof meta.format === "string" ? `${meta.format} format` : null),
      };
    }
    if (action === "UPLOAD" && meta.type === "template_apply") {
      const env = formatEnvType(meta.environmentType);
      return {
        summary: "applied template",
        highlight: typeof meta.templateName === "string" ? meta.templateName : null,
        detail: joinDetail(group, env ? `to ${env}` : null),
      };
    }
    if (action === "UPLOAD" && typeof meta.key === "string") {
      return { summary: "created variable", highlight: meta.key, detail: group };
    }
    if (action === "UPDATE" && typeof meta.key === "string") {
      return { summary: "updated variable", highlight: meta.key, detail: group };
    }
    if (action === "DELETE" && typeof meta.key === "string") {
      return { summary: "deleted variable", highlight: meta.key, detail: group };
    }
    if (action === "DELETE" && typeof meta.type === "string") {
      const env = formatEnvType(meta.type);
      return {
        summary: `deleted ${env} environment`,
        highlight: null,
        detail: joinDetail(
          group,
          typeof meta.variableCount === "number" ? `${meta.variableCount} variables removed` : null,
        ),
      };
    }
    if (action === "DOWNLOAD" && meta.type === "bundle") {
      return {
        summary: "downloaded bundle",
        highlight: null,
        detail: joinDetail(
          group,
          `${meta.fileCount ?? 0} files`,
          `${meta.variableCount ?? 0} variables`,
        ),
      };
    }
    if (action === "DOWNLOAD") {
      const env = formatEnvType(meta.environmentType);
      const format = typeof meta.format === "string" ? meta.format : null;
      return {
        summary: `exported ${meta.count ?? ""} variables`.trim(),
        highlight: null,
        detail: joinDetail(group, env, format),
      };
    }
    if (action === "CLONE") {
      return {
        summary: "cloned environment",
        highlight: null,
        detail: joinDetail(
          group,
          `${formatEnvType(meta.source)} → ${formatEnvType(meta.target)}`,
          `${meta.variableCount ?? 0} variables`,
        ),
      };
    }
  }

  if (resourceType === "ENV_TEMPLATE") {
    const name = typeof meta.name === "string" ? meta.name : null;
    const count = typeof meta.variableCount === "number" ? `${meta.variableCount} variables` : null;
    return { summary: `${verb} template`, highlight: name, detail: joinDetail(group, count) };
  }

  if (resourceType === "SECRET_FILE") {
    const fileName = typeof meta.fileName === "string" ? meta.fileName : null;
    if (meta.action === "new_version") {
      return { summary: "uploaded new version", highlight: fileName, detail: group };
    }
    return { summary: `${verb} file`, highlight: fileName, detail: group };
  }

  if (resourceType === "SHARE_LINK") {
    if (action === "SHARE" && meta.payloadType === "ENV_VARIABLES") {
      return {
        summary: `shared ${meta.variableCount ?? ""} variables`.trim(),
        highlight: null,
        detail: "via link",
      };
    }
    if (action === "SHARE" && meta.payloadType === "SECRET_FILE") {
      return {
        summary: "shared file",
        highlight: typeof meta.fileName === "string" ? meta.fileName : null,
        detail: "via link",
      };
    }
    if (action === "READ") {
      const type = meta.payloadType === "SECRET_FILE" ? "file" : "variables";
      return { summary: `accessed shared ${type}`, highlight: null, detail: "via link" };
    }
    if (action === "DELETE") {
      return { summary: "revoked share link", highlight: null, detail: null };
    }
  }

  return fallback;
}
