"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSubscriptionPlanLimit } from "@/providers/subscription-provider";
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

const PLAN_LIMIT_PATTERN = /limit reached.*upgrade/i;

function isPlanLimitError(message: string): boolean {
  return PLAN_LIMIT_PATTERN.test(message);
}

/**
 * Wraps `useMutation` with Eden Treaty response unwrapping, query invalidation, and toast notifications.
 * Automatically detects plan limit errors (403) and shows the upgrade dialog instead of a generic error toast.
 */
export function useApiMutation<TData, TVariables = void>(
  mutationFn: MutationFn<TData, TVariables>,
  options?: UseApiMutationOptions<TData, TVariables>,
) {
  const queryClient = useQueryClient();
  const notification = useToast();
  const { showUpgradePrompt } = useSubscriptionPlanLimit();

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
      if (isPlanLimitError(error.message)) {
        showUpgradePrompt(error.message);
        return;
      }

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
