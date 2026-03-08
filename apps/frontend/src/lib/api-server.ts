import { createApiClient } from "@depvault/shared/api";
import { cookies } from "next/headers";
import { API_BASE_URL, COOKIE_NAMES } from "./constants";

export async function getServerClient() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(COOKIE_NAMES.accessToken)?.value;

  return createApiClient(API_BASE_URL, {
    headers: {
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    },
  });
}
