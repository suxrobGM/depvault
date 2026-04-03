import type { ReactElement } from "react";
import { createApiClient } from "@depvault/shared/api";
import { Command, Option } from "clipanion";
import { Box, Text } from "ink";
import { resetApiClient } from "@/services/api-client";
import { loadConfig } from "@/services/config";
import { saveCredentials } from "@/services/credentials";
import { ErrorBox } from "@/ui/error-box";
import { Panel } from "@/ui/panel";
import { Success } from "@/ui/success";
import { colors } from "@/ui/theme";
import { getFlag } from "@/utils/args";
import { renderResult } from "@/utils/render";

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 300_000; // 5 minutes

export default async function handler(args: string[]): Promise<ReactElement> {
  const config = loadConfig();
  const server = getFlag(args, "server") ?? config.server;

  const client = createApiClient(server);

  // Step 1: Request device code
  const { data: deviceCode, error: deviceError } = await client.api.auth.device.post();

  if (deviceError || !deviceCode) {
    return (
      <ErrorBox message={`Device code request failed: ${deviceError?.value ?? "Unknown error"}`} />
    );
  }

  // Display the code to the user
  const { renderToString } = await import("ink");

  const codePanel = renderToString(
    <Box flexDirection="column" gap={1}>
      <Panel title="Device Authorization" borderColor={colors.brand}>
        <Text>Open this URL in your browser:</Text>
        <Text color={colors.highlight} bold>
          {deviceCode.verificationUrl}
        </Text>
        <Text> </Text>
        <Text>Enter this code:</Text>
        <Text color={colors.brand} bold>
          {"  "}
          {deviceCode.userCode}
        </Text>
      </Panel>
    </Box>,
  );
  console.log(codePanel);

  // Step 2: Poll for token
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const { data: token, error: tokenError } = await client.api.auth.device.token.post({
      deviceCode: deviceCode.deviceCode,
    });

    if (tokenError) continue;

    if (!token || token.status === "pending") continue;

    if (token.status === "expired") {
      return <ErrorBox message="Device code expired. Please try again." />;
    }

    if (token.status === "verified" && token.accessToken && token.refreshToken && token.user) {
      saveCredentials({
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        userId: token.user.id,
        email: token.user.email,
      });
      resetApiClient();
      return <Success message={`Logged in as ${token.user.email}`} />;
    }
  }

  return <ErrorBox message="Authentication timed out. Please try again." />;
}

export class LoginCommand extends Command {
  static override paths = [["login"]];
  static override usage = Command.Usage({ description: "Authenticate via browser" });

  server = Option.String("--server", { required: false });

  async execute(): Promise<void> {
    const args = this.server ? [`--server=${this.server}`] : [];
    await renderResult(this.context.stdout, handler, args);
  }
}
