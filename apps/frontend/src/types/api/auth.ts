import type { client } from "@/lib/api";
import type { Data } from "./utils";

export type AuthResponseDto = Data<typeof client.api.auth.login.post>;
export type AuthUserDto = AuthResponseDto["user"];
