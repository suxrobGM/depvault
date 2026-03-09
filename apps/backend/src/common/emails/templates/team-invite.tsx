import type { ReactElement } from "react";
import { Button, Text } from "@react-email/components";
import { BaseLayout } from "../components/base-layout";
import { button, heading, highlight, paragraph } from "../components/styles";

interface TeamInviteProps {
  inviterName: string;
  projectName: string;
  role: string;
  dashboardUrl: string;
}

export function TeamInviteTemplate(props: TeamInviteProps): ReactElement {
  const { inviterName, projectName, role, dashboardUrl } = props;

  return (
    <BaseLayout preview={`${inviterName} invited you to ${projectName} on DepVault`}>
      <Text style={heading}>You've been invited to a project</Text>
      <Text style={paragraph}>
        <span style={highlight}>{inviterName}</span> has invited you to join{" "}
        <span style={highlight}>{projectName}</span> as a <span style={highlight}>{role}</span>.
      </Text>
      <Text style={paragraph}>
        You can now access the project's dependencies, environment variables, and collaboration
        features.
      </Text>
      <Button style={button} href={dashboardUrl}>
        Open Dashboard
      </Button>
    </BaseLayout>
  );
}
