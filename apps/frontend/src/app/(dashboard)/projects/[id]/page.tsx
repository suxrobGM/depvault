import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage(props: PageProps) {
  const { id } = await props.params;
  redirect(ROUTES.projectOverview(id));
}
