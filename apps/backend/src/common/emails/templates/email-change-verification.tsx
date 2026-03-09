import type { ReactElement } from "react";
import { Button, Link, Text } from "@react-email/components";
import { BaseLayout } from "../components/base-layout";
import { button, heading, highlight, link, muted, paragraph } from "../components/styles";

interface EmailChangeVerificationProps {
  firstName: string;
  newEmail: string;
  verificationUrl: string;
}

export function EmailChangeVerificationTemplate(props: EmailChangeVerificationProps): ReactElement {
  const { firstName, newEmail, verificationUrl } = props;

  return (
    <BaseLayout preview="Verify your new email address on DepVault">
      <Text style={heading}>Verify your new email</Text>
      <Text style={paragraph}>
        Hi {firstName}, your email address is being changed to{" "}
        <span style={highlight}>{newEmail}</span>. Please verify this new address by clicking the
        button below.
      </Text>
      <Button style={button} href={verificationUrl}>
        Verify New Email
      </Button>
      <Text style={paragraph}>
        If the button doesn't work, copy and paste this link into your browser:
      </Text>
      <Link href={verificationUrl} style={link}>
        {verificationUrl}
      </Link>
      <Text style={muted}>
        If you didn't initiate this change, please secure your account immediately by resetting your
        password.
      </Text>
    </BaseLayout>
  );
}
