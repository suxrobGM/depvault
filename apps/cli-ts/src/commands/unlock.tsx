import { createElement, type ReactElement } from "react";
import { PasswordInput } from "@inkjs/ui";
import { Box, render, Text } from "ink";
import { deriveKekFromPassword } from "@/services/dek-resolver";
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

/**
 * Unlock command. In REPL mode, the caller (app.tsx) should store the resulting KEK
 * in VaultContext. This handler returns the derived KEK via a special property.
 */
export default async function handler(args: string[]): Promise<ReactElement> {
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
    return <ErrorBox message="No password provided." />;
  }

  try {
    const kek = await deriveKekFromPassword(password);
    // Store the KEK on the result element so the REPL can extract it
    const result = <Success message="Vault unlocked." />;
    (result as any).__kek = kek;
    return result;
  } catch (err) {
    return <ErrorBox message={err instanceof Error ? err.message : "Failed to unlock vault."} />;
  }
}
