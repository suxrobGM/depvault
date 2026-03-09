import type { ReactElement } from "react";
import { Button, Text } from "@react-email/components";
import { BaseLayout } from "../components/base-layout";
import { button, heading, paragraph } from "../components/styles";

interface EnvDriftWarningProps {
  firstName: string;
  projectName: string;
  missingVars: { env: string; variable: string }[];
  dashboardUrl: string;
}

const table = {
  width: "100%",
  borderCollapse: "collapse" as const,
  marginBottom: "16px",
} as const;

const th = {
  textAlign: "left" as const,
  padding: "8px 12px",
  fontSize: "12px",
  fontWeight: 600,
  color: "#8898aa",
  textTransform: "uppercase" as const,
  borderBottom: "2px solid #e6ebf1",
} as const;

const td = {
  padding: "8px 12px",
  fontSize: "14px",
  color: "#525f7f",
  borderBottom: "1px solid #e6ebf1",
} as const;

export function EnvDriftWarningTemplate(props: EnvDriftWarningProps): ReactElement {
  const { firstName, projectName, missingVars, dashboardUrl } = props;

  return (
    <BaseLayout preview={`Environment drift detected in ${projectName}`}>
      <Text style={heading}>Environment Drift Warning</Text>
      <Text style={paragraph}>
        Hi {firstName}, we detected missing variables across environments in{" "}
        <strong>{projectName}</strong>:
      </Text>
      <table style={table}>
        <thead>
          <tr>
            <th style={th}>Environment</th>
            <th style={th}>Missing Variable</th>
          </tr>
        </thead>
        <tbody>
          {missingVars.map((item, i) => (
            <tr key={i}>
              <td style={td}>{item.env}</td>
              <td style={{ ...td, fontFamily: "monospace" }}>{item.variable}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Text style={paragraph}>
        Environment drift can cause deployment failures. Please add the missing variables to ensure
        consistency across environments.
      </Text>
      <Button style={button} href={dashboardUrl}>
        Fix Variables
      </Button>
    </BaseLayout>
  );
}
