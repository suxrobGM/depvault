import type { ReactElement } from "react";
import { Button, Text } from "@react-email/components";
import { BaseLayout } from "../components/base-layout";
import { button, heading, highlight, paragraph } from "../components/styles";

interface PlatformInviteProps {
  inviterName: string;
  projectName: string;
  role: string;
  registerUrl: string;
}

export function PlatformInviteTemplate(props: PlatformInviteProps): ReactElement {
  const { inviterName, projectName, role, registerUrl } = props;

  return (
    <BaseLayout preview={`${inviterName} invited you to ${projectName} on DepVault`}>
      <Text style={heading}>You've been invited to join DepVault</Text>
      <Text style={paragraph}>
        <span style={highlight}>{inviterName}</span> has invited you to join{" "}
        <span style={highlight}>{projectName}</span> as a <span style={highlight}>{role}</span>.
      </Text>
      <Text style={paragraph}>
        DepVault helps teams analyze dependencies, detect vulnerabilities, and securely manage
        environment variables. Create an account to get started.
      </Text>
      <Button style={button} href={registerUrl}>
        Create Account
      </Button>
    </BaseLayout>
  );
}
