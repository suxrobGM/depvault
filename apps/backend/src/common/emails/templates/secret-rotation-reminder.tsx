import type { ReactElement } from "react";
import { Button, Text } from "@react-email/components";
import { BaseLayout } from "../components/base-layout";
import { button, heading, paragraph } from "../components/styles";

interface SecretRotationReminderProps {
  firstName: string;
  projectName: string;
  variableNames: string[];
  dashboardUrl: string;
}

const listItem = {
  fontSize: "14px",
  lineHeight: "24px",
  color: "#525f7f",
  fontFamily: "monospace",
  backgroundColor: "#f6f9fc",
  padding: "4px 8px",
  borderRadius: "4px",
  display: "inline-block" as const,
  marginBottom: "4px",
} as const;

export function SecretRotationReminderTemplate(props: SecretRotationReminderProps): ReactElement {
  const { firstName, projectName, variableNames, dashboardUrl } = props;

  return (
    <BaseLayout preview={`Secret rotation reminder for ${projectName}`}>
      <Text style={heading}>Secret Rotation Reminder</Text>
      <Text style={paragraph}>
        Hi {firstName}, the following secrets in <strong>{projectName}</strong> are due for
        rotation:
      </Text>
      {variableNames.map((name) => (
        <Text key={name} style={listItem}>
          {name}
        </Text>
      ))}
      <Text style={paragraph}>
        Regularly rotating secrets helps maintain security. Please update these variables at your
        earliest convenience.
      </Text>
      <Button style={button} href={dashboardUrl}>
        Manage Secrets
      </Button>
    </BaseLayout>
  );
}
