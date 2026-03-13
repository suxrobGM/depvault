import type { ReactElement, ReactNode } from "react";
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface BaseLayoutProps {
  preview: string;
  children: ReactNode;
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
} as const;

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
  borderRadius: "8px",
  border: "1px solid #e6ebf1",
} as const;

const header = {
  padding: "32px 48px 0",
} as const;

const logoImg = {
  width: "140px",
  height: "40px",
} as const;

const content = {
  padding: "0 48px",
} as const;

const footerSection = {
  padding: "0 48px",
} as const;

const footerText = {
  fontSize: "12px",
  lineHeight: "16px",
  color: "#8898aa",
} as const;

export function BaseLayout(props: BaseLayoutProps): ReactElement {
  const { preview, children } = props;

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Img
              src={`${process.env.FRONTEND_URL ?? "https://depvault.com"}/depvault-logo-light.svg`}
              alt="DepVault"
              style={logoImg}
            />
          </Section>
          <Section style={content}>{children}</Section>
          <Hr style={{ borderColor: "#e6ebf1", margin: "20px 48px" }} />
          <Section style={footerSection}>
            <Text style={footerText}>
              DepVault — Dependency analysis and environment management
            </Text>
            <Text style={footerText}>
              You received this email because you have an account on DepVault. If you didn't expect
              this email, you can safely ignore it.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
