import type { Body, Data } from "@depvault/shared/api";
import type { client } from "@/api/client";

type ProjectById = ReturnType<typeof client.api.projects>;

export type ScanSummaryDto = Data<ProjectById["scan-summary"]["get"]>;

export type ScanListResponseDto = Data<ProjectById["scans"]["get"]>;
export type ScanDto = ScanListResponseDto["items"][number];

export type DetectionListResponseDto = Data<ProjectById["detections"]["get"]>;
export type DetectionDto = DetectionListResponseDto["items"][number];

export type BatchUpdateDetectionsBody = Body<ProjectById["detections"]["patch"]>;

export type BatchUpdateDetectionsDto = Data<ProjectById["detections"]["patch"]>;

export type PatternListResponseDto = Data<ProjectById["scan-patterns"]["get"]>;
export type PatternDto = PatternListResponseDto["items"][number];
