/**
 * Shape of a job posting fetched from an external board.
 *
 * Deliberately separate from `Application` in `src/lib/types.ts`: a listing is
 * transient data from someone else's API, an application is the user's own
 * record. Importing converts one into the other and nothing else is persisted.
 */

import type { WorkMode } from "@/lib/types";

import type { JobFamily } from "./families";

export interface JobListing {
  /** `greenhouse:{slug}:{jobId}` — unique across boards, stable across fetches. */
  id: string;
  company: string;
  /** Greenhouse board token, used to filter without matching on display names. */
  companySlug: string;
  position: string;
  /** Greenhouse hands back `•`-separated multi-city strings; kept whole. */
  location: string;
  workMode: WorkMode;
  /** Link to the public posting. */
  url: string;
  /** Top-level Greenhouse department, e.g. "Engineering". Empty when absent. */
  department: string;
  /** Coarse bucket inferred from the title, for cross-company filtering. */
  family: JobFamily;
  /** Plain text, ready for `buildMatchReport`. Truncated; see DESCRIPTION_LIMIT. */
  description: string;
  /** ISO timestamp of first publication. */
  postedAt: string;
}

export interface JobSearchResponse {
  jobs: JobListing[];
  /** Matches before pagination, so the UI can say "24 of 312". */
  total: number;
  page: number;
  pageSize: number;
  /** How many matches fall in each family, for the counts on the filter chips. */
  familyCounts: Partial<Record<JobFamily, number>>;
  /** Boards that failed this request. Surfaced rather than hidden. */
  failedCompanies: string[];
}
