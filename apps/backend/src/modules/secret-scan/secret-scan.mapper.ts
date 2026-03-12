import type { ScanStatus } from "@/generated/prisma";
import type { DetectionResponse, ScanResponse } from "./secret-scan.schema";

interface ScanRecord {
  id: string;
  projectId: string;
  triggeredById: string;
  status: ScanStatus;
  commitsScanned: number;
  detectionsFound: number;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
}

interface DetectionRecord {
  id: string;
  projectId: string;
  scanId: string;
  commitHash: string;
  filePath: string;
  lineNumber: number | null;
  matchSnippet: string;
  status: string;
  resolvedById: string | null;
  resolvedAt: Date | null;
  remediationSteps: string | null;
  createdAt: Date;
  scanPattern: { name: string; severity: string };
}

export function toScanResponse(scan: ScanRecord): ScanResponse {
  return {
    id: scan.id,
    projectId: scan.projectId,
    triggeredById: scan.triggeredById,
    status: scan.status,
    commitsScanned: scan.commitsScanned,
    detectionsFound: scan.detectionsFound,
    startedAt: scan.startedAt,
    completedAt: scan.completedAt,
    errorMessage: scan.errorMessage,
    createdAt: scan.createdAt,
  };
}

export function toDetectionResponse(d: DetectionRecord): DetectionResponse {
  return {
    id: d.id,
    projectId: d.projectId,
    scanId: d.scanId,
    commitHash: d.commitHash,
    filePath: d.filePath,
    lineNumber: d.lineNumber,
    matchSnippet: d.matchSnippet,
    status: d.status,
    resolvedById: d.resolvedById,
    resolvedAt: d.resolvedAt,
    remediationSteps: d.remediationSteps,
    createdAt: d.createdAt,
    patternName: d.scanPattern.name,
    patternSeverity: d.scanPattern.severity,
  } as DetectionResponse;
}
