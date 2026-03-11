import type { SelectOption } from "../types";

/** Supported environment type identifiers (excludes GLOBAL — for vault variables only). */
export const ENVIRONMENT_TYPE_VALUES = ["DEVELOPMENT", "STAGING", "PRODUCTION"] as const;

export type EnvironmentTypeValue = (typeof ENVIRONMENT_TYPE_VALUES)[number];

/** Environment type options with display labels for UI dropdowns. */
export const ENVIRONMENT_TYPES = [
  { value: "DEVELOPMENT", label: "Development" },
  { value: "STAGING", label: "Staging" },
  { value: "PRODUCTION", label: "Production" },
] as const satisfies readonly SelectOption<EnvironmentTypeValue>[];

/** All environment type values including GLOBAL (for secret files). */
export const SECRET_FILE_ENVIRONMENT_TYPE_VALUES = [
  "DEVELOPMENT",
  "STAGING",
  "PRODUCTION",
  "GLOBAL",
] as const;

export type SecretFileEnvironmentTypeValue = (typeof SECRET_FILE_ENVIRONMENT_TYPE_VALUES)[number];

/** Environment type options for secret files (includes Global). */
export const SECRET_FILE_ENV_TYPES = [
  { value: "GLOBAL", label: "Global" },
  { value: "DEVELOPMENT", label: "Development" },
  { value: "STAGING", label: "Staging" },
  { value: "PRODUCTION", label: "Production" },
] as const satisfies readonly SelectOption<SecretFileEnvironmentTypeValue>[];

/** Get the display label for an environment type value. */
export function getEnvironmentLabel(type: string): string {
  const all = [...ENVIRONMENT_TYPES, { value: "GLOBAL", label: "Global" }];
  return all.find((t) => t.value === type)?.label ?? type;
}
