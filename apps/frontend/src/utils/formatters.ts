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

/**
 * Formats a date as a short relative label (e.g. "5m ago", "3d ago"),
 * falling back to locale date after 7 days.
 */
export function formatRelativeTime(date: Date | string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);

  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(date).toLocaleDateString();
}
