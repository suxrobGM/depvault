import {
  ECOSYSTEM_CONFIGS,
  getEcosystemLabel,
  getPackageUrl,
  type EcosystemValue,
} from "@depvault/shared/constants";

export type { EcosystemValue };
export { getEcosystemLabel, getPackageUrl };

/** Ecosystems with active parser support, for the upload form dropdown. */
const SUPPORTED_ECOSYSTEMS: ReadonlySet<string> = new Set(["NODEJS", "PYTHON", "DOTNET", "KOTLIN"]);

export const ECOSYSTEMS = ECOSYSTEM_CONFIGS.filter((c) => SUPPORTED_ECOSYSTEMS.has(c.value)).map(
  (c) => ({ value: c.value, label: c.label, defaultFile: c.defaultFile }),
);

export function getHealthColor(score: number | null): "success" | "warning" | "error" | "default" {
  if (score === null) return "default";
  if (score >= 80) return "success";
  if (score >= 50) return "warning";
  return "error";
}

export const STATUS_VARIANT: Record<string, "success" | "warning" | "error" | "default"> = {
  UP_TO_DATE: "success",
  PATCH_UPDATE: "success",
  MINOR_UPDATE: "warning",
  MAJOR_UPDATE: "error",
  DEPRECATED: "error",
};

export const STATUS_LABEL: Record<string, string> = {
  UP_TO_DATE: "Up to date",
  PATCH_UPDATE: "Patch update",
  MINOR_UPDATE: "Minor update",
  MAJOR_UPDATE: "Major update",
  DEPRECATED: "Deprecated",
};

export const STATUS_ORDER: Record<string, number> = {
  DEPRECATED: 0,
  MAJOR_UPDATE: 1,
  MINOR_UPDATE: 2,
  PATCH_UPDATE: 3,
  UP_TO_DATE: 4,
};
