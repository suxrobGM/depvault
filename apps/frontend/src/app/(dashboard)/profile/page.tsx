import type { Route } from "next";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants";

export default function ProfilePage() {
  redirect(ROUTES.profileGeneral as Route);
}
