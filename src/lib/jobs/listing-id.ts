import type { JobListing } from "./types";

/**
 * Greenhouse listing ids use colons (`greenhouse:stripe:123`). Those are a
 * bad path segment — Next can hand back an encoded or truncated param, and
 * the detail page then misses both the application and the in-memory preview.
 * Tildes are safe in a single `[id]` segment.
 */
export function listingPathId(id: string): string {
  return decodeParam(id).replaceAll(":", "~");
}

export function listingStoreId(param: string): string {
  return decodeParam(param).replaceAll("~", ":");
}

export function listingIdCandidates(param: string): string[] {
  const raw = decodeParam(param);
  const store = listingStoreId(param);
  return [...new Set([param, raw, store, listingPathId(store)])];
}

function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const PREVIEW_PREFIX = "applypath:preview:";

export function writeListingPreview(listing: JobListing): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      `${PREVIEW_PREFIX}${listing.id}`,
      JSON.stringify(listing),
    );
  } catch {
    /* quota / private mode — in-memory preview may still work */
  }
}

export function readListingPreview(param: string): JobListing | undefined {
  if (typeof window === "undefined") return undefined;
  for (const id of listingIdCandidates(param)) {
    try {
      const raw = window.sessionStorage.getItem(`${PREVIEW_PREFIX}${id}`);
      if (!raw) continue;
      return JSON.parse(raw) as JobListing;
    } catch {
      /* ignore bad JSON */
    }
  }
  return undefined;
}
