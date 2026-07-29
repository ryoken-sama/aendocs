/** Formats an aenapply timestamp (format unconfirmed — likely a MySQL/
 * Laravel "YYYY-MM-DD HH:MM:SS" string) as a short relative time, e.g.
 * "2 hours ago". Falls back to the raw string if it doesn't parse, rather
 * than showing "Invalid Date" or throwing. */
export function formatTimeAgo(timestamp: string): string {
  if (!timestamp) return "";

  const then = new Date(timestamp.includes("T") ? timestamp : timestamp.replace(" ", "T"));
  if (Number.isNaN(then.getTime())) return timestamp;

  const seconds = Math.round((Date.now() - then.getTime()) / 1000);
  if (seconds < 0) return "just now";
  if (seconds < 60) return "just now";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;

  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;

  const years = Math.round(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}
