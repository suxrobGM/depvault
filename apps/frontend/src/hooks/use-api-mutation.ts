"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

type MutationFn<TData, TVariables> = (variables: TVariables) => Promise<{
  data: TData;
  error: unknown;
}>;

interface UseApiMutationOptions<TData, TVariables> {
  invalidateKeys?: unknown[][];
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error) => void;
}

export function useApiMutation<TData, TVariables = void>(
  mutationFn: MutationFn<TData, TVariables>,
  options?: UseApiMutationOptions<TData, TVariables>,
) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables) => {
      const { data, error } = await mutationFn(variables);
      if (error) throw error;
      return data as TData;
    },
    onSuccess: (data, variables) => {
      options?.invalidateKeys?.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      options?.onSuccess?.(data, variables);
    },
    onError: options?.onError,
  });
}
