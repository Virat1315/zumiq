/**
 * Formatting helpers.
 *
 * All of these are pure and locale-pinned to en-US. Locale-dependent output
 * would differ between the server render and the browser, which React reports
 * as a hydration mismatch.
 */

export function money(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/** Compact currency for headline tiles: $18.4M rather than $18,400,000. */
export function moneyCompact(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e9) return "$" + (n / 1e9).toFixed(1) + "B";
  if (a >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (a >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
  return "$" + n.toFixed(0);
}

export function pct(n: number, digits = 1): string {
  return n.toFixed(digits) + "%";
}

export function signedPct(n: number, digits = 1): string {
  return (n > 0 ? "+" : "") + n.toFixed(digits) + "%";
}

export function num(n: number): string {
  return n.toLocaleString("en-US");
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "14 Jul 2026" from an ISO timestamp, without pulling in a date library. */
export function isoDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "14 Jul 2026, 13:45 UTC" for audit trails, where the time matters. */
export function isoDateTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${isoDate(iso)}, ${hh}:${mm} UTC`;
}

/** Whole days between two ISO timestamps, rounded down. */
export function daysBetween(a: string, b: string): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

/** Joins class names, dropping falsey ones. The usual `cn` helper. */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
