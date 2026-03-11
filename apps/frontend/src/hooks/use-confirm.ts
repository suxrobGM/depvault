"use client";

import { use } from "react";
import { ConfirmContext, type ConfirmFn } from "@/providers/confirm-provider";

export function useConfirm(): ConfirmFn {
  const confirm = use(ConfirmContext);

  if (!confirm) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }

  return confirm;
}
