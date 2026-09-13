import type { JobListing } from "@/lib/jobs/types";
import { buildMatchReport } from "@/lib/keywords";

export function scoreListings(jobs: JobListing[], masterText: string) {
  return jobs.map((listing) => ({
    listing,
    score: masterText
      ? buildMatchReport(listing.description, masterText).score
      : null,
  }));
}
