import { getCommandContext } from "@/app/command-context";
import type { CommandResult } from "@/types/command";
import { ErrorBox } from "@/ui/error-box";
import { Success } from "@/ui/success";

export default async function handler(_args: string[]): Promise<CommandResult> {
  const ctx = getCommandContext();

  if (ctx && !ctx.isVaultUnlocked) {
    return { element: <ErrorBox message="Vault is already locked." /> };
  }

  return {
    element: <Success message="Vault locked. KEK and DEK cache cleared." />,
    lock: true,
  };
}
