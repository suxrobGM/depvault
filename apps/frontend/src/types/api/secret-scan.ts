import type { client } from "@/lib/api";
import type { Data } from "./utils";

type ProjectById = ReturnType<(typeof client)["api"]["projects"]>;

export type ScanSummaryResponse = Data<ProjectById["scan-summary"]["get"]>;

export type ScanListResponse = Data<ProjectById["scans"]["get"]>;
export type ScanResponse = ScanListResponse["items"][number];

export type DetectionListResponse = Data<ProjectById["detections"]["get"]>;
export type DetectionResponse = DetectionListResponse["items"][number];

export type BatchUpdateDetectionsBody = Parameters<ProjectById["detections"]["patch"]>[0];

export type BatchUpdateDetectionsResponse = Data<ProjectById["detections"]["patch"]>;

export type PatternListResponse = Data<ProjectById["scan-patterns"]["get"]>;
export type PatternResponse = PatternListResponse["items"][number];
