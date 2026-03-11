"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useEffect } from "react";
import { useToast } from "./use-toast";

type QueryFn<T> = () => Promise<{ data: T | null; error: unknown }>;

interface UseApiQueryOptions<T> extends Omit<UseQueryOptions<T>, "queryKey" | "queryFn"> {
  errorMessage?: string | ((error: Error) => string);
}

/**
 * Wraps `useQuery` with Eden Treaty response unwrapping and optional error toast via `errorMessage`.
 */
export function useApiQuery<T>(
  queryKey: unknown[],
  queryFn: QueryFn<T>,
  options?: UseApiQueryOptions<T>,
) {
  const { errorMessage, ...queryOptions } = options ?? {};
  const notification = useToast();

  const result = useQuery<T>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await queryFn();
      if (error) {
        throw error;
      }
      return data as T;
    },
    ...queryOptions,
  });

  useEffect(() => {
    if (result.error && errorMessage) {
      const msg =
        typeof errorMessage === "function" ? errorMessage(result.error as Error) : errorMessage;
      notification.error(msg);
    }
  }, [result.error, errorMessage, notification]);

  return result;
}
