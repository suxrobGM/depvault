import { describe, expect, it } from "bun:test";
import type { DependencyStatus, Vulnerability } from "@/generated/prisma";
import { calculateHealthScore } from "./analysis.utils";

function dep(status: DependencyStatus, vulns: Pick<Vulnerability, "severity">[] = []) {
  return { status, vulnerabilities: vulns };
}

describe("calculateHealthScore", () => {
  it("should return null for empty dependencies", () => {
    expect(calculateHealthScore([])).toBeNull();
  });

  it("should return 100 for all up-to-date deps with no vulnerabilities", () => {
    expect(calculateHealthScore([dep("UP_TO_DATE"), dep("UP_TO_DATE")])).toBe(100);
  });

  it("should deduct 2 per minor update", () => {
    expect(calculateHealthScore([dep("MINOR_UPDATE")])).toBe(98);
    expect(calculateHealthScore([dep("MINOR_UPDATE"), dep("MINOR_UPDATE")])).toBe(96);
  });

  it("should deduct 5 per major update", () => {
    expect(calculateHealthScore([dep("MAJOR_UPDATE")])).toBe(95);
  });

  it("should deduct 10 per deprecated dependency", () => {
    expect(calculateHealthScore([dep("DEPRECATED")])).toBe(90);
  });

  it("should deduct 15 per critical vulnerability", () => {
    expect(calculateHealthScore([dep("UP_TO_DATE", [{ severity: "CRITICAL" }])])).toBe(85);
  });

  it("should deduct 10 per high vulnerability", () => {
    expect(calculateHealthScore([dep("UP_TO_DATE", [{ severity: "HIGH" }])])).toBe(90);
  });

  it("should deduct 5 per medium vulnerability", () => {
    expect(calculateHealthScore([dep("UP_TO_DATE", [{ severity: "MEDIUM" }])])).toBe(95);
  });

  it("should deduct 2 per low vulnerability", () => {
    expect(calculateHealthScore([dep("UP_TO_DATE", [{ severity: "LOW" }])])).toBe(98);
  });

  it("should not deduct for none severity", () => {
    expect(calculateHealthScore([dep("UP_TO_DATE", [{ severity: "NONE" }])])).toBe(100);
  });

  it("should combine status and vulnerability deductions", () => {
    const result = calculateHealthScore([dep("MAJOR_UPDATE", [{ severity: "HIGH" }])]);
    // 100 - 5 (major) - 10 (high) = 85
    expect(result).toBe(85);
  });

  it("should handle multiple vulnerabilities on one dependency", () => {
    const result = calculateHealthScore([
      dep("UP_TO_DATE", [{ severity: "CRITICAL" }, { severity: "MEDIUM" }, { severity: "LOW" }]),
    ]);
    // 100 - 15 - 5 - 2 = 78
    expect(result).toBe(78);
  });

  it("should clamp score to minimum 0", () => {
    const deps = Array.from({ length: 10 }, () =>
      dep("DEPRECATED", [{ severity: "CRITICAL" }, { severity: "CRITICAL" }]),
    );
    // 100 - 10*(10 + 15 + 15) = 100 - 400 = -300 → clamped to 0
    expect(calculateHealthScore(deps)).toBe(0);
  });

  it("should clamp score to maximum 100", () => {
    expect(calculateHealthScore([dep("UP_TO_DATE")])).toBe(100);
  });

  it("should handle a realistic mixed scenario", () => {
    const result = calculateHealthScore([
      dep("UP_TO_DATE"),
      dep("UP_TO_DATE"),
      dep("MINOR_UPDATE"),
      dep("MAJOR_UPDATE", [{ severity: "HIGH" }]),
      dep("UP_TO_DATE", [{ severity: "LOW" }]),
      dep("DEPRECATED"),
    ]);
    // 100 - 0 - 0 - 2 - (5 + 10) - 2 - 10 = 71
    expect(result).toBe(71);
  });
});
