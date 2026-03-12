import type { client } from "@/lib/api";
import type { Data } from "./utils";

export type SecurityOverviewResponse = Data<(typeof client)["api"]["security"]["overview"]["get"]>;
