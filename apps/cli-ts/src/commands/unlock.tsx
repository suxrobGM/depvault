import { createElement, type ReactElement } from "react";
import { PasswordInput } from "@inkjs/ui";
import { Box, render, Text } from "ink";
import { deriveKekFromPassword } from "@/services/dek-resolver";
import type { CommandContext, CommandResult } from "@/types/command";
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

/** Prompt for password — REPL mode uses the shared prompt context, one-shot spawns a standalone UI. */
async function getPassword(ctx?: CommandContext): Promise<string> {
  if (ctx) return ctx.requestPassword();

  return new Promise<string>((resolve) => {
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

export default async function handler(
  _args: string[],
  ctx?: CommandContext,
): Promise<CommandResult> {
  if (ctx?.isVaultUnlocked) {
    return { element: <ErrorBox message="Vault is already unlocked." /> };
  }

  const password = await getPassword(ctx);

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
