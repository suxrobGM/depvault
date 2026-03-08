"use client";

import { useSnackbar } from "notistack";

interface UseNotificationReturn {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

export function useNotification(): UseNotificationReturn {
  const { enqueueSnackbar } = useSnackbar();

  const success = (message: string) => enqueueSnackbar(message, { variant: "success" });
  const error = (message: string) => enqueueSnackbar(message, { variant: "error" });
  const warning = (message: string) => enqueueSnackbar(message, { variant: "warning" });
  const info = (message: string) => enqueueSnackbar(message, { variant: "info" });

  return { success, error, warning, info };
}
