import { parseDate } from "@/lib/dates";

/** Calendar-style windows, plus a 24-hour cut. `null` means any date. */
export type PostedWindow = 1 | 7 | 30 | null;

export const POSTED_FILTERS: {
  value: PostedWindow;
  param: string;
  label: string;
}[] = [
  { value: 1, param: "1", label: "24h" },
  { value: 7, param: "7", label: "7 days" },
  { value: 30, param: "30", label: "30 days" },
  { value: null, param: "", label: "Any time" },
];

export const DEFAULT_POSTED_WINDOW: PostedWindow = 7;

export function parsePostedWindow(raw: string | null): PostedWindow {
  if (raw === "1") return 1;
  if (raw === "7") return 7;
  if (raw === "30") return 30;
  return null;
}

export function postedWindowParam(window: PostedWindow): string {
  if (window === 1) return "1";
  if (window === 7) return "7";
  if (window === 30) return "30";
  return "";
}

/** True when `postedAt` falls inside the window. Empty dates drop out of a window. */
export function listingIsWithinPostedWindow(
  postedAt: string,
  window: PostedWindow,
): boolean {
  if (window == null) return true;
  const date = parseDate(postedAt);
  if (!date) return false;
  const ageMs = Date.now() - date.getTime();
  if (ageMs < 0) return true;
  return ageMs <= window * 24 * 60 * 60 * 1000;
}
