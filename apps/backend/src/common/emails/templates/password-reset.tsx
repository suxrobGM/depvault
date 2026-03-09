import type { ReactElement } from "react";
import { Button, Link, Text } from "@react-email/components";
import { BaseLayout } from "../components/base-layout";
import { button, heading, link, muted, paragraph } from "../components/styles";

interface PasswordResetProps {
  firstName: string;
  resetUrl: string;
}

export function PasswordResetTemplate(props: PasswordResetProps): ReactElement {
  const { firstName, resetUrl } = props;

  return (
    <BaseLayout preview="Reset your DepVault password">
      <Text style={heading}>Reset your password</Text>
      <Text style={paragraph}>
        Hi {firstName}, we received a request to reset your password. Click the button below to
        choose a new one.
      </Text>
      <Button style={button} href={resetUrl}>
        Reset Password
      </Button>
      <Text style={paragraph}>
        If the button doesn't work, copy and paste this link into your browser:
      </Text>
      <Link href={resetUrl} style={link}>
        {resetUrl}
      </Link>
      <Text style={muted}>This link will expire in 1 hour.</Text>
      <Text style={muted}>
        If you didn't request a password reset, you can safely ignore this email. Your password will
        remain unchanged.
      </Text>
    </BaseLayout>
  );
}
