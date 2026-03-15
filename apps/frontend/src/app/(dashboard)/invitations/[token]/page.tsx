import type { ReactElement } from "react";
import { InvitationAction } from "@/components/features/invitations/invitation-action";

interface InvitationPageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ action?: string }>;
}

export default async function InvitationPage(props: InvitationPageProps): Promise<ReactElement> {
  const { token } = await props.params;
  //const { action } = await props.searchParams;

  return <InvitationAction token={token} />;
}
