/**
 * Date helpers. All stored dates are calendar dates in `yyyy-mm-dd` form so
 * they never shift across timezones; parsing goes through `parseDate` which
 * anchors to local noon to dodge DST edges.
 */

export function todayIso(): string {
  return toIsoDate(new Date());
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Returns `null` for empty or malformed input rather than an Invalid Date. */
export function parseDate(iso: string): Date | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (match) {
    const [, y, m, d] = match;
    return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0, 0);
  }
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function addDays(iso: string, days: number): string {
  const date = parseDate(iso) ?? new Date();
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

/** Whole days from `from` to `to`. Negative when `to` is in the past. */
export function daysBetween(from: string, to: string): number {
  const a = parseDate(from);
  const b = parseDate(to);
  if (!a || !b) return 0;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((b.getTime() - a.getTime()) / msPerDay);
}

export function daysSince(iso: string): number {
  return daysBetween(iso, todayIso());
}

export function formatDate(iso: string): string {
  const date = parseDate(iso);
  if (!date) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatShortDate(iso: string): string {
  const date = parseDate(iso);
  if (!date) return "—";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** "today", "in 3 days", "5 days ago" — used for follow-ups and reminders. */
export function formatRelativeDay(iso: string): string {
  const diff = daysBetween(todayIso(), iso);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  if (diff > 0) return `in ${diff} days`;
  return `${Math.abs(diff)} days ago`;
}

/** Monday-anchored start of the ISO week containing `date`. */
export function startOfWeek(date: Date = new Date()): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayOfWeek = (result.getDay() + 6) % 7; // Monday = 0
  result.setDate(result.getDate() - dayOfWeek);
  return result;
}

export function isWithinLastDays(iso: string, days: number): boolean {
  const diff = daysSince(iso);
  return diff >= 0 && diff < days;
}
