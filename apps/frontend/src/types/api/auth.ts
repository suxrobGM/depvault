import type { client } from "@/lib/api";
import type { Data } from "./utils";

export type AuthResponse = Data<(typeof client)["api"]["auth"]["login"]["post"]>;
export type AuthUser = AuthResponse["user"];
