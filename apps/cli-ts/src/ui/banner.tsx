import type { ReactElement } from "react";
import { Box, Text } from "ink";
import { VERSION } from "@/constants";
import { colors } from "./theme";

// ANSI Shadow font "DEPVAULT"
const DEP_LINES = [
  "██████╗ ███████╗██████╗ ",
  "██╔══██╗██╔════╝██╔══██╗",
  "██║  ██║█████╗  ██████╔╝",
  "██║  ██║██╔══╝  ██╔═══╝ ",
  "██████╔╝███████╗██║     ",
  "╚═════╝ ╚══════╝╚═╝     ",
];

const VAULT_LINES = [
  "██╗   ██╗ █████╗ ██╗   ██╗██╗  ████████╗",
  "██║   ██║██╔══██╗██║   ██║██║  ╚══██╔══╝",
  "██║   ██║███████║██║   ██║██║     ██║   ",
  "╚██╗ ██╔╝██╔══██║██║   ██║██║     ██║   ",
  " ╚████╔╝ ██║  ██║╚██████╔╝███████╗██║   ",
  "  ╚═══╝  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝   ",
];

interface BannerProps {
  email?: string;
  vaultLocked?: boolean;
  projectName?: string;
}

export function Banner(props: BannerProps): ReactElement {
  const { email, vaultLocked, projectName } = props;

  return (
    <Box flexDirection="column" paddingLeft={2} marginBottom={1}>
      <Box flexDirection="column">
        {DEP_LINES.map((dep, i) => (
          <Box key={i}>
            <Text color={colors.white} bold>
              {dep}
            </Text>
            <Text color={colors.brand} bold>
              {VAULT_LINES[i]}
            </Text>
          </Box>
        ))}
      </Box>

      <Box marginTop={1} justifyContent="space-between">
        <Text color={colors.muted}>Secure your stack. Analyze. Vault. Ship.</Text>
        <Text color={colors.muted}>v{VERSION}</Text>
      </Box>

      <Text color={colors.muted}>{"─".repeat(69)}</Text>

      {email && (
        <Box gap={1}>
          <Text color={colors.highlight}>{email}</Text>
          <Text color={colors.muted}>·</Text>
          <Text color={vaultLocked === false ? colors.success : colors.warning}>
            {vaultLocked === false ? "🔓 Unlocked" : "🔒 Locked"}
          </Text>
          {projectName && (
            <>
              <Text color={colors.muted}>·</Text>
              <Text color={colors.white}>{projectName}</Text>
            </>
          )}
        </Box>
      )}
    </Box>
  );
}
