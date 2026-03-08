"use client";

import { use } from "react";
import { AuthContext, type AuthContextValue } from "@/providers/auth-provider";

export function useAuth(): AuthContextValue {
  const context = use(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
