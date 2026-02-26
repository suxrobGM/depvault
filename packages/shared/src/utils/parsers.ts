/**
 * Parse a comma-separated string of numeric IDs into a validated number array.
 * Filters out NaN and non-positive values.
 */
export function parseNumericIds(value: string | undefined | null): number[] {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map(Number)
    .filter((n) => !isNaN(n) && n > 0);
}
