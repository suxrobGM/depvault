"use client";

import { use } from "react";
import { VaultContext, type VaultContextValue } from "@/providers/vault-provider";

/** Access the vault context for encryption operations and vault state. */
export function useVault(): VaultContextValue {
  const context = use(VaultContext);
  if (!context) {
    throw new Error("useVault must be used within a VaultProvider");
  }
  return context;
}
