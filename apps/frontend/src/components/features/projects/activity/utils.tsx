import type { ReactElement } from "react";
import {
  ContentCopy as CloneIcon,
  Add as CreateIcon,
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
  CREATE: { icon: <CreateIcon fontSize="small" />, color: "success.main", verb: "created" },
  READ: { icon: <ViewIcon fontSize="small" />, color: "info.main", verb: "viewed" },
  UPDATE: { icon: <EditIcon fontSize="small" />, color: "warning.main", verb: "updated" },
  DELETE: { icon: <DeleteIcon fontSize="small" />, color: "error.main", verb: "deleted" },
  DOWNLOAD: { icon: <DownloadIcon fontSize="small" />, color: "success.main", verb: "downloaded" },
  SHARE: { icon: <ShareIcon fontSize="small" />, color: "secondary.main", verb: "shared" },
  UPLOAD: { icon: <UploadIcon fontSize="small" />, color: "primary.main", verb: "uploaded" },
  CLONE: { icon: <CloneIcon fontSize="small" />, color: "info.light", verb: "cloned" },
};

export const RESOURCE_LABELS: Record<string, string> = {
  CONFIG_FILE: "Config File",
  SECRET_FILE: "Secret File",
  SHARE_LINK: "Share Link",
  CI_TOKEN: "CI Token",
};

const VALID_COLOR_KEYS = ["info", "warning", "error", "success", "secondary", "primary"] as const;
type PaletteColorKey = (typeof VALID_COLOR_KEYS)[number];

export function getActivityColor(color: string): PaletteColorKey {
  const key = color.split(".")[0];
  return VALID_COLOR_KEYS.includes(key as PaletteColorKey) ? (key as PaletteColorKey) : "info";
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

  if (!meta) {
    return fallback;
  }

  const environmentSlug = typeof meta.environmentSlug === "string" ? meta.environmentSlug : null;

  if (resourceType === "CONFIG_FILE") {
    const relativePath = typeof meta.relativePath === "string" ? meta.relativePath : null;

    if (action === "UPLOAD") {
      return { summary: "created config file", highlight: relativePath, detail: environmentSlug };
    }
    if (action === "UPDATE" && typeof meta.restoredFrom === "string") {
      return { summary: "restored config file", highlight: relativePath, detail: environmentSlug };
    }
    if (action === "UPDATE") {
      return { summary: "updated config file", highlight: relativePath, detail: environmentSlug };
    }
    if (action === "DELETE") {
      return { summary: "deleted config file", highlight: relativePath, detail: environmentSlug };
    }
    if (action === "DOWNLOAD") {
      return {
        summary: "downloaded config file",
        highlight: relativePath,
        detail: environmentSlug,
      };
    }
    return { summary: `${verb} config file`, highlight: relativePath, detail: environmentSlug };
  }

  if (resourceType === "SECRET_FILE") {
    const fileName =
      typeof meta.fileName === "string"
        ? meta.fileName
        : typeof meta.relativePath === "string"
          ? meta.relativePath
          : null;
    if (meta.action === "new_version") {
      return { summary: "uploaded new version", highlight: fileName, detail: environmentSlug };
    }
    return { summary: `${verb} file`, highlight: fileName, detail: environmentSlug };
  }

  if (resourceType === "CI_TOKEN") {
    const name = typeof meta.name === "string" ? meta.name : null;
    const appName = typeof meta.appName === "string" ? meta.appName : null;
    return {
      summary: `${verb} ci token`,
      highlight: name,
      detail: joinDetail(appName, environmentSlug),
    };
  }

  if (resourceType === "SHARE_LINK") {
    if (action === "SHARE") {
      return {
        summary: "shared a file",
        highlight: typeof meta.fileName === "string" ? meta.fileName : null,
        detail: "via link",
      };
    }
    if (action === "READ") {
      return { summary: "accessed shared file", highlight: null, detail: "via link" };
    }
    if (action === "DELETE") {
      return { summary: "revoked share link", highlight: null, detail: null };
    }
  }

  return fallback;
}
