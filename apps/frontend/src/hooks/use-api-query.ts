"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";

type QueryFn<T> = () => Promise<{ data: T | null; error: unknown }>;

export function useApiQuery<T>(
  queryKey: unknown[],
  queryFn: QueryFn<T>,
  options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">,
) {
  return useQuery<T>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await queryFn();
      if (error) throw error;
      return data as T;
    },
    ...options,
  });
}
