import type { client } from "@/lib/api";
import type { Data } from "./utils";

export type GlobalActivityListResponse = Data<(typeof client)["api"]["activity"]["get"]>;
export type GlobalActivityEntry = GlobalActivityListResponse["items"][number];
