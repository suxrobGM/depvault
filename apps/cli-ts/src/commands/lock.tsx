import type { ReactElement } from "react";
import { Success } from "@/ui/success";

export default async function handler(_args: string[]): Promise<ReactElement> {
  // The actual KEK/DEK clearing is handled by VaultContext in app.tsx
  const result = <Success message="Vault locked. KEK and DEK cache cleared." />;
  (result as any).__lock = true;
  return result;
}
