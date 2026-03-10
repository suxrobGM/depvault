import type { DependencyStatus, Vulnerability } from "@/generated/prisma";

interface Dependency {
  status: DependencyStatus;
  vulnerabilities: Pick<Vulnerability, "severity">[];
}

/**
 * Calculate a health score for a project based on its dependencies. The score starts at 100 and is reduced based on the status of each dependency and the severity of any vulnerabilities. The final score is capped between 0 and 100.
 * @param dependencies The list of dependencies to evaluate for health scoring.
 * @returns A health score between 0 and 100, or null if there are no dependencies.
 */
export function calculateHealthScore(dependencies: Dependency[]): number | null {
  if (dependencies.length === 0) {
    return null;
  }

  let score = 100;
  for (const dep of dependencies) {
    if (dep.status === "MAJOR_UPDATE") score -= 5;
    else if (dep.status === "MINOR_UPDATE") score -= 2;
    else if (dep.status === "DEPRECATED") score -= 10;

    for (const vuln of dep.vulnerabilities) {
      if (vuln.severity === "CRITICAL") score -= 15;
      else if (vuln.severity === "HIGH") score -= 10;
      else if (vuln.severity === "MEDIUM") score -= 5;
      else if (vuln.severity === "LOW") score -= 2;
    }
  }

  return Math.max(0, Math.min(100, score));
}
