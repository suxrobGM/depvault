import type { client } from "@/lib/api";
import type { Data } from "./utils";

export type ConvertResult = Data<(typeof client)["api"]["convert"]["post"]>;
