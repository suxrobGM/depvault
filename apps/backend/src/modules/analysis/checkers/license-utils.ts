import type { LicensePolicy } from "@/generated/prisma";

interface LicenseRule {
  licenseId: string;
  policy: LicensePolicy;
}

const PERMISSIVE_LICENSES = new Set([
  "MIT",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "0BSD",
  "CC0-1.0",
  "Unlicense",
  "BlueOak-1.0.0",
  "CC-BY-4.0",
  "Zlib",
  "PSF-2.0",
  "Python-2.0",
  "BSL-1.0",
]);

const COPYLEFT_LICENSES = new Set([
  "GPL-2.0",
  "GPL-2.0-only",
  "GPL-2.0-or-later",
  "GPL-3.0",
  "GPL-3.0-only",
  "GPL-3.0-or-later",
  "AGPL-3.0",
  "AGPL-3.0-only",
  "AGPL-3.0-or-later",
  "LGPL-2.1",
  "LGPL-2.1-only",
  "LGPL-2.1-or-later",
  "LGPL-3.0",
  "LGPL-3.0-only",
  "LGPL-3.0-or-later",
  "MPL-2.0",
  "EUPL-1.2",
  "CPAL-1.0",
  "OSL-3.0",
  "CECILL-2.1",
]);

/** Evaluate default policy: permissive = ALLOW, copyleft = WARN, unknown = WARN */
function defaultPolicy(spdxId: string): LicensePolicy {
  if (PERMISSIVE_LICENSES.has(spdxId)) return "ALLOW";
  if (COPYLEFT_LICENSES.has(spdxId)) return "WARN";
  return "WARN";
}

/** Resolve license policy using project-specific rules, falling back to defaults */
export function resolveLicensePolicy(
  license: string | null,
  projectRules: LicenseRule[],
): LicensePolicy {
  if (!license) return "WARN";

  const spdxId = license.trim();

  const rule = projectRules.find((r) => r.licenseId.toLowerCase() === spdxId.toLowerCase());

  if (rule) return rule.policy;

  return defaultPolicy(spdxId);
}
