import type { Data } from "@depvault/shared/api";
import type { client } from "@/api/client";

export type AuthResponseDto = Data<typeof client.api.auth.login.post>;
export type AuthUserDto = AuthResponseDto["user"];
