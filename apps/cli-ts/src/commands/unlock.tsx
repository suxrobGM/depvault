import { createElement, type ReactElement } from "react";
import { PasswordInput } from "@inkjs/ui";
import { Box, render, Text } from "ink";
import { getCommandContext } from "@/app/command-context";
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
  const ctx = getCommandContext();

  if (ctx?.isVaultUnlocked) {
    return { element: <ErrorBox message="Vault is already unlocked." /> };
  }

  let password: string;

  if (ctx) {
    // REPL mode: use shared prompt context
    password = await ctx.requestPassword();
  } else {
    // One-shot CLI mode: spawn standalone password prompt
    password = await new Promise<string>((resolve) => {
      const { unmount } = render(
        createElement(PasswordPrompt, {
          onSubmit: (pw: string) => {
            unmount();
            resolve(pw);
          },
        }),
      );
    });
  }

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
