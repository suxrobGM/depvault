import type { Data } from "@depvault/shared/api";
import type { client } from "@/api/client";

export type SecurityOverviewDto = Data<typeof client.api.security.overview.get>;
