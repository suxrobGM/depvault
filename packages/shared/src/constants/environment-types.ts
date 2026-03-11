import type { SelectOption } from "../types";

/** Supported environment type identifiers. */
export const ENVIRONMENT_TYPE_VALUES = ["DEVELOPMENT", "STAGING", "PRODUCTION", "CUSTOM"] as const;

export type EnvironmentTypeValue = (typeof ENVIRONMENT_TYPE_VALUES)[number];

/** Environment type options with display labels for UI dropdowns. */
export const ENVIRONMENT_TYPES = [
  { value: "DEVELOPMENT", label: "Development" },
  { value: "STAGING", label: "Staging" },
  { value: "PRODUCTION", label: "Production" },
  { value: "CUSTOM", label: "Custom" },
] as const satisfies readonly SelectOption<EnvironmentTypeValue>[];
