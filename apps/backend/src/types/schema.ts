import { t } from "elysia";

/**
 * OpenAPI-compliant TypeBox helpers.
 *
 * Elysia's default `t.Date()` and `t.Enum()` produce JSON Schema constructs
 * that are not valid OpenAPI 3.0 (`type: "Date"`, `anyOf` with `const`).
 * These helpers generate standard output that works with Kiota, swagger-codegen,
 * and other OpenAPI tooling.
 */

/**
 * Produces `{ type: "string", format: "date-time" }` in OpenAPI output
 * while keeping the `Date` TypeScript type for Elysia's automatic serialization.
 */
export const tDateTime = () => t.Unsafe<Date>({ type: "string", format: "date-time" });

/**
 * Produces `{ type: "string", enum: [...] }` instead of `{ anyOf: [{ const: ... }] }`.
 *
 * Accepts a Prisma-generated const enum object (e.g. `Ecosystem`, `EnvironmentType`).
 */
export const tStringEnum = <T extends Record<string, string>>(enumObj: T) =>
  t.Unsafe<T[keyof T]>({
    type: "string",
    enum: Object.values(enumObj),
  });

/**
 * Produces `{ type: "string", enum: [...] }` from a string array.
 *
 * Use for literal union values like config format arrays.
 */
export const tStringUnion = <T extends readonly string[]>(values: T) =>
  t.Unsafe<T[number]>({
    type: "string",
    enum: [...values],
  });
