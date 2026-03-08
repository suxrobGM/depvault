"use client";

import type { PropsWithChildren, ReactElement } from "react";
import { SnackbarProvider } from "notistack";

export function NotificationProvider({ children }: PropsWithChildren): ReactElement {
  return (
    <SnackbarProvider
      maxSnack={3}
      autoHideDuration={4000}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    >
      {children}
    </SnackbarProvider>
  );
}
