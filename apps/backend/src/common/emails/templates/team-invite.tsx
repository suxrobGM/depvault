import type { ReactElement } from "react";
import { Button, Link, Text } from "@react-email/components";
import { BaseLayout } from "../components/base-layout";
import { button, heading, highlight, muted, paragraph } from "../components/styles";

interface TeamInviteProps {
  inviterName: string;
  projectName: string;
  role: string;
  acceptUrl: string;
  declineUrl: string;
}

export function TeamInviteTemplate(props: TeamInviteProps): ReactElement {
  const { inviterName, projectName, role, acceptUrl, declineUrl } = props;

  return (
    <BaseLayout preview={`${inviterName} invited you to ${projectName} on DepVault`}>
      <Text style={heading}>You've been invited to a project</Text>
      <Text style={paragraph}>
        <span style={highlight}>{inviterName}</span> has invited you to join{" "}
        <span style={highlight}>{projectName}</span> as a <span style={highlight}>{role}</span>.
      </Text>
      <Text style={paragraph}>
        Accept the invitation to access the project's dependencies, environment variables, and
        collaboration features.
      </Text>
      <Button style={button} href={acceptUrl}>
        Accept Invitation
      </Button>
      <Text style={muted}>
        Not interested?{" "}
        <Link href={declineUrl} style={muted}>
          Decline this invitation
        </Link>
      </Text>
    </BaseLayout>
  );
}
