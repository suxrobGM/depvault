import type { Data } from "@depvault/shared/api";
import type { client } from "@/api/client";

export type GlobalActivityListResponseDto = Data<typeof client.api.activity.get>;
export type GlobalActivityEntryDto = GlobalActivityListResponseDto["items"][number];
