/**
 * Job search over the public Greenhouse board API.
 *
 * The fetching lives here rather than in the browser because the boards are
 * large — around 50 MB across every company once descriptions are included.
 * This route fetches and filters server-side and hands back one page of
 * normalized listings, so the client deals in kilobytes.
 *
 * Nothing personal is sent here. The resume never leaves the browser; match
 * scoring happens client-side against the listings this route returns.
 */

import type { NextRequest } from "next/server";

import { COMPANY_SLUGS, findCompany } from "@/lib/jobs/companies";
import { JOB_FAMILIES, type JobFamily } from "@/lib/jobs/families";
import {
  familyOf,
  isRemote,
  loadBoards,
  postedAtOf,
  searchTextOf,
  toJobListing,
  type BoardJob,
} from "@/lib/jobs/greenhouse";
import {
  listingIsWithinPostedWindow,
  parsePostedWindow,
} from "@/lib/jobs/posted";
import type { JobSearchResponse } from "@/lib/jobs/types";

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 48;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const query = params.get("q")?.trim().toLowerCase() ?? "";
  const remoteOnly = params.get("remote") === "1";

  const requestedFamily = params.get("family");
  const family = JOB_FAMILIES.includes(requestedFamily as JobFamily)
    ? (requestedFamily as JobFamily)
    : null;

  const posted = parsePostedWindow(params.get("posted"));

  const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.parseInt(params.get("pageSize") ?? "", 10) || DEFAULT_PAGE_SIZE),
  );

  // `company` may repeat: ?company=stripe&company=figma. Unknown slugs are
  // dropped rather than 400'd so a stale bookmark still returns something.
  const requested = params.getAll("company").filter((slug) => findCompany(slug));
  const slugs = requested.length > 0 ? requested : COMPANY_SLUGS;

  const { jobs, failed } = await loadBoards(slugs);

  if (jobs.length === 0 && failed.length > 0) {
    return Response.json(
      { error: "Every job board failed to respond. Try again shortly." },
      { status: 502 },
    );
  }

  const matchesSearch = (job: BoardJob) => {
    if (remoteOnly && !isRemote(job)) return false;
    if (!listingIsWithinPostedWindow(postedAtOf(job), posted)) return false;
    if (!query) return true;
    return searchTextOf(job).includes(query);
  };

  const searched = jobs.filter(matchesSearch);

  // Counts come from the set before the family filter is applied, so picking a
  // family does not zero out every other chip.
  const familyCounts: Partial<Record<JobFamily, number>> = {};
  for (const job of searched) {
    const key = familyOf(job);
    familyCounts[key] = (familyCounts[key] ?? 0) + 1;
  }

  const matched = family
    ? searched.filter((job) => familyOf(job) === family)
    : searched;

  matched.sort((a, b) => postedAtOf(b).localeCompare(postedAtOf(a)));

  const start = (page - 1) * pageSize;
  const body: JobSearchResponse = {
    jobs: matched.slice(start, start + pageSize).map(toJobListing),
    total: matched.length,
    page,
    pageSize,
    familyCounts,
    failedCompanies: failed,
  };

  return Response.json(body);
}
