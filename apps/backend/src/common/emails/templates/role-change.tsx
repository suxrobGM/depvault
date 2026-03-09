import type { ReactElement } from "react";
import { Button, Text } from "@react-email/components";
import { BaseLayout } from "../components/base-layout";
import { button, heading, highlight, paragraph } from "../components/styles";

interface RoleChangeProps {
  firstName: string;
  projectName: string;
  oldRole: string;
  newRole: string;
  dashboardUrl: string;
}

export function RoleChangeTemplate(props: RoleChangeProps): ReactElement {
  const { firstName, projectName, oldRole, newRole, dashboardUrl } = props;

  return (
    <BaseLayout preview={`Your role in ${projectName} has changed`}>
      <Text style={heading}>Role Updated</Text>
      <Text style={paragraph}>
        Hi {firstName}, your role in <span style={highlight}>{projectName}</span> has been changed
        from <span style={highlight}>{oldRole}</span> to <span style={highlight}>{newRole}</span>.
      </Text>
      <Text style={paragraph}>Your permissions have been updated to reflect your new role.</Text>
      <Button style={button} href={dashboardUrl}>
        Open Project
      </Button>
    </BaseLayout>
  );
}
