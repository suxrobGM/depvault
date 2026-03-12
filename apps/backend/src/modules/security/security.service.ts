import { singleton } from "tsyringe";
import { DetectionStatus, PrismaClient, VulnerabilitySeverity } from "@/generated/prisma";
import type { SecurityOverviewResponse } from "./security.schema";

@singleton()
export class SecurityService {
  constructor(private readonly prisma: PrismaClient) {}

  /** Aggregate vulnerability and secret scan stats across all user's projects */
  async getOverview(userId: string): Promise<SecurityOverviewResponse> {
    const memberProjects = await this.prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    });

    const projectIds = memberProjects.map((m) => m.projectId);

    if (projectIds.length === 0) {
      return {
        vulnerabilities: { critical: 0, high: 0, medium: 0, low: 0, none: 0, total: 0 },
        secretScans: { totalScans: 0, openDetections: 0, resolvedDetections: 0 },
        projectCount: 0,
      };
    }

    const [vulnCounts, totalScans, openDetections, resolvedDetections] = await Promise.all([
      this.prisma.vulnerability.groupBy({
        by: ["severity"],
        where: { dependency: { analysis: { projectId: { in: projectIds } } } },
        _count: true,
      }),
      this.prisma.secretScan.count({
        where: { projectId: { in: projectIds } },
      }),
      this.prisma.secretDetection.count({
        where: { projectId: { in: projectIds }, status: DetectionStatus.OPEN },
      }),
      this.prisma.secretDetection.count({
        where: {
          projectId: { in: projectIds },
          status: { in: [DetectionStatus.RESOLVED, DetectionStatus.FALSE_POSITIVE] },
        },
      }),
    ]);

    const severities = { critical: 0, high: 0, medium: 0, low: 0, none: 0 };
    let total = 0;

    for (const group of vulnCounts) {
      const count = group._count;
      total += count;

      if (group.severity === VulnerabilitySeverity.CRITICAL) {
        severities.critical = count;
      } else if (group.severity === VulnerabilitySeverity.HIGH) {
        severities.high = count;
      } else if (group.severity === VulnerabilitySeverity.MEDIUM) {
        severities.medium = count;
      } else if (group.severity === VulnerabilitySeverity.LOW) {
        severities.low = count;
      } else {
        severities.none = count;
      }
    }

    return {
      vulnerabilities: { ...severities, total },
      secretScans: { totalScans, openDetections, resolvedDetections },
      projectCount: projectIds.length,
    };
  }
}
