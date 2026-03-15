import type { ReactElement } from "react";
import { Button, Text } from "@react-email/components";
import { BaseLayout } from "../components/base-layout";
import { button, heading, highlight, paragraph } from "../components/styles";

interface MemberRemovedProps {
  firstName: string;
  projectName: string;
  dashboardUrl: string;
}

export function MemberRemovedTemplate(props: MemberRemovedProps): ReactElement {
  const { firstName, projectName, dashboardUrl } = props;

  return (
    <BaseLayout preview={`You've been removed from ${projectName}`}>
      <Text style={heading}>Removed from project</Text>
      <Text style={paragraph}>
        Hi <span style={highlight}>{firstName}</span>, you have been removed from{" "}
        <span style={highlight}>{projectName}</span>. You no longer have access to this project's
        resources.
      </Text>
      <Text style={paragraph}>
        If you believe this was a mistake, please contact the project owner.
      </Text>
      <Button style={button} href={dashboardUrl}>
        Open Dashboard
      </Button>
    </BaseLayout>
  );
}
