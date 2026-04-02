import type { ReactElement } from "react";
import { resetApiClient } from "@/services/api-client";
import { clearCredentials } from "@/services/credentials";
import { Success } from "@/ui/success";

export default async function handler(_args: string[]): Promise<ReactElement> {
  clearCredentials();
  resetApiClient();
  return <Success message="Logged out. Credentials cleared." />;
}
