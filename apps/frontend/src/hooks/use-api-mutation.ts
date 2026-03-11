"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";

type MutationFn<TData, TVariables> = (variables: TVariables) => Promise<{
  data: TData | null;
  error: unknown;
}>;

interface EdenError extends Error {
  value: { message: string };
}

interface UseApiMutationOptions<TData, TVariables> {
  invalidateKeys?: unknown[][];
  successMessage?: string | ((data: TData) => string);
  errorMessage?: string | ((error: EdenError) => string);
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: EdenError) => void;
}

/**
 * Wraps `useMutation` with Eden Treaty response unwrapping, query invalidation, and toast notifications.
 * Use `successMessage`/`errorMessage` for notification-only cases; `onSuccess`/`onError` for side effects.
 */
export function useApiMutation<TData, TVariables = void>(
  mutationFn: MutationFn<TData, TVariables>,
  options?: UseApiMutationOptions<TData, TVariables>,
) {
  const queryClient = useQueryClient();
  const notification = useToast();

  return useMutation<TData, EdenError, TVariables>({
    mutationFn: async (variables) => {
      const { data, error } = await mutationFn(variables);
      if (error) {
        throw new Error((error as EdenError)?.value?.message);
      }
      return data as TData;
    },
    onSuccess: (data, variables) => {
      options?.invalidateKeys?.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));

      if (options?.successMessage) {
        const msg =
          typeof options.successMessage === "function"
            ? options.successMessage(data)
            : options.successMessage;
        notification.success(msg);
      }

      options?.onSuccess?.(data, variables);
    },
    onError: (error) => {
      if (options?.onError) {
        options.onError(error);
      } else if (options?.errorMessage) {
        const msg =
          typeof options.errorMessage === "function"
            ? options.errorMessage(error)
            : options.errorMessage;
        notification.error(msg);
      } else {
        notification.error(error.message ?? "Something went wrong");
      }
    },
  });
}
