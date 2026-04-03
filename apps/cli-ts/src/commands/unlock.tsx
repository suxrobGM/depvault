import { createElement, type ReactElement } from "react";
import { PasswordInput } from "@inkjs/ui";
import { Box, render, Text } from "ink";
import { deriveKekFromPassword } from "@/services/dek-resolver";
import type { CommandResult } from "@/types/command";
import { ErrorBox } from "@/ui/error-box";
import { Success } from "@/ui/success";
import { colors } from "@/ui/theme";

function PasswordPrompt(props: { onSubmit: (password: string) => void }): ReactElement {
  return (
    <Box>
      <Text color={colors.highlight}>Vault password: </Text>
      <PasswordInput onSubmit={props.onSubmit} />
    </Box>
  );
}

export default async function handler(_args: string[]): Promise<CommandResult> {
  const password = await new Promise<string>((resolve) => {
    const { unmount } = render(
      createElement(PasswordPrompt, {
        onSubmit: (pw: string) => {
          unmount();
          resolve(pw);
        },
      }),
    );
  });

  if (!password) {
    return { element: <ErrorBox message="No password provided." /> };
  }

  try {
    const kek = await deriveKekFromPassword(password);
    return { element: <Success message="Vault unlocked." />, kek };
  } catch (err) {
    return {
      element: (
        <ErrorBox message={err instanceof Error ? err.message : "Failed to unlock vault."} />
      ),
    };
  }
}
