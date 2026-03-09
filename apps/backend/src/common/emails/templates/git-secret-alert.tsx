import type { ReactElement } from "react";
import { Button, Text } from "@react-email/components";
import { BaseLayout } from "../components/base-layout";
import { alertBadge, button, heading, muted, paragraph } from "../components/styles";

interface GitSecretAlertProps {
  firstName: string;
  projectName: string;
  fileName: string;
  dashboardUrl: string;
}

export function GitSecretAlertTemplate(props: GitSecretAlertProps): ReactElement {
  const { firstName, projectName, fileName, dashboardUrl } = props;

  return (
    <BaseLayout preview={`Secret detected in ${projectName}`}>
      <Text style={heading}>Secret Detected in Repository</Text>
      <Text style={paragraph}>Hi {firstName},</Text>
      <Text style={alertBadge}>
        A secret was detected in <strong>{fileName}</strong> in {projectName}
      </Text>
      <Text style={paragraph}>
        Exposed secrets in source code are a critical security risk. We strongly recommend you:
      </Text>
      <Text style={paragraph}>
        1. Rotate the exposed secret immediately{"\n"}
        2. Remove it from the repository history{"\n"}
        3. Store it securely in DepVault's env vault
      </Text>
      <Button style={button} href={dashboardUrl}>
        View Details
      </Button>
      <Text style={muted}>
        This is an urgent security notification. Please address it as soon as possible.
      </Text>
    </BaseLayout>
  );
}
