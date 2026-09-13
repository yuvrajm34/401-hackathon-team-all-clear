/**
 * Greenhouse job board client. Server-side only — imported by the /api/jobs
 * route handler, never by a client component.
 *
 * Greenhouse publishes every company's open roles at a public, keyless
 * endpoint. It is the same feed their embeddable careers widget reads, so it is
 * stable and meant to be consumed programmatically.
 */

import { findCompany, type JobCompany } from "./companies";
import { classifyFamily, type JobFamily } from "./families";
import { htmlToText, truncateText } from "./html";
import type { JobListing } from "./types";

const BOARD_URL = "https://boards-api.greenhouse.io/v1/boards";

/** Long enough that typing in the search box never refetches, short enough to stay current. */
const CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * Enough text for keyword matching and a readable preview without shipping
 * 8 KB of boilerplate benefits copy per row.
 */
const DESCRIPTION_LIMIT = 6000;

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  company_name: string;
  first_published: string | null;
  updated_at: string | null;
  location: { name: string } | null;
  departments: { name: string }[] | null;
  content: string | null;
}

/** A raw posting kept next to the company it came from. */
export interface BoardJob {
  raw: GreenhouseJob;
  company: JobCompany;
}

/**
 * Boards are cached in module memory rather than through `fetch`'s `next`
 * options on purpose: Next refuses data-cache entries over 2 MB, and all but
 * the smallest of these boards blow past that once descriptions are included.
 * Relying on it would silently refetch ~50 MB on every keystroke.
 */
const cache = new Map<string, { fetchedAt: number; jobs: GreenhouseJob[] }>();

async function loadBoard(company: JobCompany): Promise<BoardJob[]> {
  const cached = cache.get(company.slug);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.jobs.map((raw) => ({ raw, company }));
  }

  const response = await fetch(
    `${BOARD_URL}/${company.slug}/jobs?content=true`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": "ApplyPath/0.1 (job search for a single user)",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      `Greenhouse board "${company.slug}" returned ${response.status}`,
    );
  }

  const payload = (await response.json()) as { jobs?: GreenhouseJob[] };
  const jobs = payload.jobs ?? [];

  cache.set(company.slug, { fetchedAt: Date.now(), jobs });

  return jobs.map((raw) => ({ raw, company }));
}

/**
 * Fetches every requested board in parallel. A board that 404s or times out is
 * reported back by slug instead of failing the whole search — one company
 * moving off Greenhouse should not take the feature down.
 */
export async function loadBoards(
  slugs: string[],
): Promise<{ jobs: BoardJob[]; failed: string[] }> {
  const companies = slugs
    .map(findCompany)
    .filter((company): company is JobCompany => Boolean(company));

  const settled = await Promise.allSettled(companies.map(loadBoard));

  const jobs: BoardJob[] = [];
  const failed: string[] = [];

  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      jobs.push(...result.value);
    } else {
      failed.push(companies[index].slug);
    }
  });

  return { jobs, failed };
}

/**
 * Department names come straight out of each company's internal org chart, so
 * some arrive as cost centres: Databricks publishes "1140 Professional
 * Services" and "[Prospect]". Stripping the code and brackets makes the filter
 * readable, and because filtering compares these cleaned values, a company that
 * uses both "1141 AMER Delivery" and "AMER Delivery" collapses into one option.
 */
export function departmentOf(job: BoardJob): string {
  const raw = job.raw.departments?.[0]?.name ?? "";
  return raw
    .replace(/[[\]]/g, "")
    .replace(/^\d[\d.\-]*\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function locationOf(job: BoardJob): string {
  return job.raw.location?.name?.trim() ?? "";
}

export function familyOf(job: BoardJob): JobFamily {
  return classifyFamily(job.raw.title, departmentOf(job));
}

/**
 * Greenhouse has no remote flag, so the location string is the only signal.
 * A concrete city is treated as onsite; the user can correct it after import,
 * and plenty of "onsite" roles turn out to be hybrid.
 */
export function workModeOf(job: BoardJob): JobListing["workMode"] {
  const location = locationOf(job).toLowerCase();
  if (!location) return "unknown";
  if (location.includes("remote")) return "remote";
  if (location.includes("hybrid")) return "hybrid";
  return "onsite";
}

export function isRemote(job: BoardJob): boolean {
  return workModeOf(job) === "remote";
}

/** Fields worth searching. The description is skipped: it is double-encoded
 *  HTML, so substring matches against it are unreliable and slow. */
export function searchTextOf(job: BoardJob): string {
  return [
    job.raw.title,
    job.company.name,
    locationOf(job),
    departmentOf(job),
  ]
    .join(" ")
    .toLowerCase();
}

export function postedAtOf(job: BoardJob): string {
  return job.raw.first_published ?? job.raw.updated_at ?? "";
}

/**
 * Converts to the shape the client consumes. Called only for the page being
 * returned, never for the full result set: `htmlToText` across four thousand
 * postings is wasted work when twenty-four are on screen.
 */
export function toJobListing(job: BoardJob): JobListing {
  return {
    id: `greenhouse:${job.company.slug}:${job.raw.id}`,
    company: job.company.name,
    companySlug: job.company.slug,
    position: job.raw.title.trim(),
    location: locationOf(job),
    workMode: workModeOf(job),
    url: job.raw.absolute_url,
    department: departmentOf(job),
    family: familyOf(job),
    description: truncateText(htmlToText(job.raw.content ?? ""), DESCRIPTION_LIMIT),
    postedAt: postedAtOf(job),
  };
}
