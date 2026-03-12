import type { ReactElement } from "react";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants";

export default async function SettingsPage(): Promise<ReactElement> {
  return redirect(ROUTES.profile);
}
