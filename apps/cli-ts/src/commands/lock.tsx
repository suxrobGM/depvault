import type { CommandResult } from "@/types/command";
import { Success } from "@/ui/success";

export default async function handler(_args: string[]): Promise<CommandResult> {
  return { element: <Success message="Vault locked. KEK and DEK cache cleared." />, lock: true };
}
