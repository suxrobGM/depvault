import type { ReactElement } from "react";
import { Box, Text } from "ink";
import { colors } from "@/ui/theme";
import { useCommandContext } from "./command-context";

interface StatusBarProps {
  email?: string;
  projectName?: string;
}

export function StatusBar(props: StatusBarProps): ReactElement {
  const { email, projectName } = props;
  const vault = useCommandContext();

  return (
    <Box gap={1}>
      {email && <Text color={colors.highlight}>{email}</Text>}
      {email && <Text color={colors.muted}>·</Text>}
      <Text color={vault.isVaultUnlocked ? colors.success : colors.warning}>
        {vault.isVaultUnlocked ? "🔓 Unlocked" : "🔒 Locked"}
      </Text>
      {projectName && (
        <>
          <Text color={colors.muted}>·</Text>
          <Text color={colors.white}>{projectName}</Text>
        </>
      )}
    </Box>
  );
}
