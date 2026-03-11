/**
 * Formats a number of bytes into a human-readable string (e.g., "1.5 KB").
 * @param bytes - The number of bytes to format.
 * @returns A formatted string representing the byte value.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Formats a date into a human-readable string (e.g., "Jan 1, 2024").
 * @param date - The date to format, either as a Date object or an ISO string.
 * @returns A formatted date string in the "en-US" locale.
 */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
