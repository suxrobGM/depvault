/**
 * Test-only typing helpers for partial mocks.
 *
 * A factory that returns an object of `mock()` functions is both a stand-in for
 * a real dependency (so it can be passed where that type is expected) and a set
 * of bun mocks (so tests can call `mockResolvedValueOnce`, inspect `mock.calls`,
 * …). `DeepMockProxy<T>` keeps the real call signatures while layering the bun
 * mock surface onto every method, so neither role needs an `any`.
 */

/**
 * Subset of the bun `Mock` control surface used in tests. The setters stay
 * permissive (a partial mock rarely returns a fully-typed entity), while
 * `mock.calls` is parameterised by the wrapped method's argument tuple so
 * assertions on recorded call arguments stay type-safe.
 */
export interface MockHelpers<Args extends unknown[] = unknown[]> {
  mockResolvedValue(value: unknown): MockHelpers<Args>;
  mockResolvedValueOnce(value: unknown): MockHelpers<Args>;
  mockRejectedValue(value: unknown): MockHelpers<Args>;
  mockRejectedValueOnce(value: unknown): MockHelpers<Args>;
  mockReturnValue(value: unknown): MockHelpers<Args>;
  mockReturnValueOnce(value: unknown): MockHelpers<Args>;
  mockImplementation(fn: (...args: unknown[]) => unknown): MockHelpers<Args>;
  mockImplementationOnce(fn: (...args: unknown[]) => unknown): MockHelpers<Args>;
  mockClear(): MockHelpers<Args>;
  mockReset(): MockHelpers<Args>;
  readonly mock: { calls: Args[]; results: Array<{ type: string; value: unknown }> };
}

/** Recursively augments every method of `T` with {@link MockHelpers}. */
export type DeepMockProxy<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => unknown
    ? T[K] & MockHelpers<A>
    : T[K] extends object
      ? DeepMockProxy<T[K]>
      : T[K];
};
