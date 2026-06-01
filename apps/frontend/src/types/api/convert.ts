import type { client } from "@/lib/api";
import type { Data } from "./utils";

export type ConvertResultDto = Data<typeof client.api.convert.post>;
