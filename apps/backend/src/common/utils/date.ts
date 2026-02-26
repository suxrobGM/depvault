/**
 * Returns the start date for a given analytics period, or null for all-time.
 * @param period - The analytics period ("today", "week", "month", or "all")
 * @returns The start date for the period, or null for all-time
 */
export function getPeriodStart(period: string): Date | null {
  const now = new Date();

  switch (period) {
    case "today": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case "week":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "month":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}
