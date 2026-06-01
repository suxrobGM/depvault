import type { client } from "@/lib/api";
import type { Data } from "./utils";

export type GlobalActivityListResponseDto = Data<typeof client.api.activity.get>;
export type GlobalActivityEntryDto = GlobalActivityListResponseDto["items"][number];
