import type { ReactElement } from "react";
import { Button, Link, Text } from "@react-email/components";
import { BaseLayout } from "../components/base-layout";
import { button, heading, link, paragraph } from "../components/styles";

interface VerifyEmailProps {
  firstName: string;
  verificationUrl: string;
}

export function VerifyEmailTemplate(props: VerifyEmailProps): ReactElement {
  const { firstName, verificationUrl } = props;

  return (
    <BaseLayout preview="Verify your email address to get started with DepVault">
      <Text style={heading}>Verify your email</Text>
      <Text style={paragraph}>
        Hi {firstName}, welcome to DepVault! Please verify your email address by clicking the button
        below.
      </Text>
      <Button style={button} href={verificationUrl}>
        Verify Email
      </Button>
      <Text style={paragraph}>
        If the button doesn't work, copy and paste this link into your browser:
      </Text>
      <Link href={verificationUrl} style={link}>
        {verificationUrl}
      </Link>
    </BaseLayout>
  );
}
