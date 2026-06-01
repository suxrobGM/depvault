/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Treaty } from "@elysiajs/eden";

/**
 * Extract the resolved response data from an Eden Treaty endpoint method.
 * Usage: `Data<typeof client.api.projects.get>`.
 */
export type Data<T extends (...args: any[]) => any> = NonNullable<Treaty.Data<T>>;

/**
 * Extract the request body from an Eden Treaty POST/PATCH/PUT endpoint method.
 * Usage: `Body<typeof client.api.projects.post>`.
 */
export type Body<T extends (...args: any[]) => any> = NonNullable<Parameters<T>[0]>;

/**
 * Extract the query params from an Eden Treaty GET endpoint method.
 * Usage: `Query<typeof client.api.activity.get>`.
 */
export type Query<T extends (...args: any[]) => any> = NonNullable<Parameters<T>[0]>["query"];
