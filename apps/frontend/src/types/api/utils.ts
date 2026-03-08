import type { Treaty } from "@elysiajs/eden";

/**
 * Extract the resolved data type from an Eden Treaty endpoint.
 * Usage: ExtractData<typeof client.api.projects, "get">
 */
export type ExtractData<T, Method extends string> = Method extends keyof T
  ? T[Method] extends (...args: never[]) => infer R
    ? Awaited<R> extends { data: infer D }
      ? NonNullable<D>
      : never
    : never
  : never;

/**
 * Shorthand for Treaty.Data — extracts data from an endpoint method reference.
 * Usage: Data<typeof client.api.auth.login.post>
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Data<T extends (...args: any[]) => any> = NonNullable<Treaty.Data<T>>;
