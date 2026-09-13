"use client";

import {
  ChevronLeft,
  ChevronRight,
  Compass,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { HydrationGate, Skeleton } from "@/components/layout/HydrationGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select, TextInput } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { toast } from "@/components/ui/Toaster";
import { cn } from "@/lib/cn";
import { COMPANIES } from "@/lib/jobs/companies";
import { JOB_FAMILIES, type JobFamily } from "@/lib/jobs/families";
import { buildDemoJobListings } from "@/lib/demo-data";
import {
  DEFAULT_POSTED_WINDOW,
  listingIsWithinPostedWindow,
  parsePostedWindow,
  POSTED_FILTERS,
  type PostedWindow,
  postedWindowParam,
} from "@/lib/jobs/posted";
import { listingPathId } from "@/lib/jobs/listing-id";
import { scoreListings } from "@/lib/jobs/scoreListings";
import type { JobListing } from "@/lib/jobs/types";
import { useJobSearch } from "@/lib/jobs/useJobSearch";
import { normalizeUrl } from "@/lib/jobs/url";
import { resumeText } from "@/lib/resume";
import { WORK_MODE_FILTERS } from "@/lib/stages";
import type { WorkMode } from "@/lib/types";
import { selectMasterResume, useAppStore } from "@/store/useAppStore";

const WORK_MODE_CHIP: Record<(typeof WORK_MODE_FILTERS)[number], string> = {
  onsite: "On-site",
  hybrid: "Hybrid",
  remote: "Remote",
};

import { DiscoverResumeDock } from "./DiscoverResumeDock";
import { JobCard } from "./JobCard";

type SortMode = "newest" | "match";

export function DiscoverView() {
  return (
    <HydrationGate>
      <DiscoverViewInner />
    </HydrationGate>
  );
}

/** Waits for typing to settle so each keystroke does not hit the route. */
function useDebounced<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return settled;
}

function DiscoverViewInner() {
  const router = useRouter();
  const applications = useAppStore((state) => state.applications);
  const resumes = useAppStore((state) => state.resumes);
  const master = useAppStore(selectMasterResume);
  const importJobListing = useAppStore((state) => state.importJobListing);
  const setDiscoverPreview = useAppStore((state) => state.setDiscoverPreview);
  const tailorResume = useAppStore((state) => state.tailorResume);
  const includeDemoJobs = useAppStore(
    (state) => state.settings.includeDemoJobs,
  );

  const [query, setQuery] = useState("");
  const [company, setCompany] = useState("all");
  const [family, setFamily] = useState<JobFamily | null>(null);
  const [workMode, setWorkMode] = useState<WorkMode | "all">("all");
  const [posted, setPosted] = useState<PostedWindow>(DEFAULT_POSTED_WINDOW);
  // Default to sorting by match once a master resume exists to score
  // against — otherwise there's nothing to match on, so newest is the only
  // sort that means anything. Only applies on mount; a user's manual
  // choice afterward isn't overridden.
  const [sort, setSort] = useState<SortMode>(() => (master ? "match" : "newest"));
  const [page, setPage] = useState(1);
  const [resumeListing, setResumeListing] = useState<JobListing | null>(null);

  /** Bumped to re-run the search when nothing about the filters changed. */
  const [retry, setRetry] = useState(0);

  const debouncedQuery = useDebounced(query.trim(), 350);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (company !== "all") params.set("company", company);
    if (family) params.set("family", family);
    if (workMode !== "all") params.set("mode", workMode);
    const postedParam = postedWindowParam(posted);
    if (postedParam) params.set("posted", postedParam);
    if (page > 1) params.set("page", String(page));
    return params.toString();
  }, [debouncedQuery, company, family, workMode, posted, page]);

  const { data, error, loading } = useJobSearch(queryString, retry);

  const masterText = useMemo(() => (master ? resumeText(master) : ""), [master]);

  /** Postings already in the pipeline, matched on the posting link. */
  const trackedUrls = useMemo(
    () =>
      new Set(
        applications
          .filter((application) => application.url)
          .map((application) => normalizeUrl(application.url)),
      ),
    [applications],
  );

  const demoMatches = useMemo(() => {
    if (!includeDemoJobs || company !== "all") return [];
    const needle = debouncedQuery.toLowerCase();
    return buildDemoJobListings().filter((job) => {
      if (workMode !== "all" && job.workMode !== workMode) return false;
      if (!listingIsWithinPostedWindow(job.postedAt, posted)) return false;
      if (!needle) return true;
      return `${job.position} ${job.company} ${job.location} ${job.department}`
        .toLowerCase()
        .includes(needle);
    });
  }, [includeDemoJobs, company, workMode, posted, debouncedQuery]);

  const visibleDemo = useMemo(
    () =>
      family ? demoMatches.filter((job) => job.family === family) : demoMatches,
    [demoMatches, family],
  );

  const familyCounts = useMemo(() => {
    const counts = { ...(data?.familyCounts ?? {}) };
    for (const job of demoMatches) {
      counts[job.family] = (counts[job.family] ?? 0) + 1;
    }
    return counts;
  }, [data, demoMatches]);

  const results = useMemo(() => {
    const board = data?.jobs ?? [];
    const merged = page === 1 ? [...visibleDemo, ...board] : board;
    const seen = new Set<string>();
    const unique = merged.filter((job) => {
      if (seen.has(job.id)) return false;
      seen.add(job.id);
      return true;
    });

    const scored = scoreListings(unique, masterText);
    if (sort === "match") {
      scored.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    } else {
      scored.sort((a, b) =>
        b.listing.postedAt.localeCompare(a.listing.postedAt),
      );
    }
    return scored;
  }, [data, visibleDemo, masterText, sort, page]);

  const total = (data?.total ?? 0) + visibleDemo.length;

  /** If the posting is already tracked, go straight to its real detail
   * page. Otherwise open the same page in a read-only preview — job
   * description, match score, AI tailoring suggestions all still render,
   * but nothing is created in the pipeline until "Add to wishlist" is
   * clicked there. Merely looking at a posting used to add it to the
   * wishlist on its own, which quietly filled up the pipeline just from
   * browsing. */
  const handleOpenApplication = (listing: JobListing) => {
    const target = normalizeUrl(listing.url);
    const existing = applications.find(
      (application) =>
        application.url && normalizeUrl(application.url) === target,
    );
    if (existing) {
      router.push(`/applications/${existing.id}`);
      return;
    }
    setDiscoverPreview(listing);
    router.push(`/applications/${listingPathId(listing.id)}`);
  };

  const handleAdd = (listing: JobListing) => {
    if (importJobListing(listing)) {
      toast(`${listing.position} at ${listing.company} added to your wishlist`);
    } else {
      toast("That posting is already in your pipeline", "info");
    }
  };

  const tailoredByUrl = useMemo(() => {
    const urls = new Set<string>();
    for (const application of applications) {
      if (!application.url || !application.resumeId) continue;
      const resume = resumes.find((item) => item.id === application.resumeId);
      if (resume && !resume.isMaster) {
        urls.add(normalizeUrl(application.url));
      }
    }
    for (const resume of resumes) {
      if (resume.isMaster || !resume.targetApplicationId) continue;
      const application = applications.find(
        (item) => item.id === resume.targetApplicationId,
      );
      if (application?.url) urls.add(normalizeUrl(application.url));
    }
    return urls;
  }, [applications, resumes]);

  const handleOpenResume = (listing: JobListing) => {
    setResumeListing(listing);
    if (!master) return;

    const target = normalizeUrl(listing.url);
    const existing = applications.find(
      (application) =>
        application.url && normalizeUrl(application.url) === target,
    );
    const applicationId = existing?.id ?? importJobListing(listing);
    const application =
      existing ??
      (applicationId
        ? useAppStore
            .getState()
            .applications.find((item) => item.id === applicationId)
        : undefined);

    if (!application) return;

    const alreadyTailored =
      (application.resumeId &&
        resumes.some(
          (resume) => resume.id === application.resumeId && !resume.isMaster,
        )) ||
      resumes.some(
        (resume) =>
          resume.targetApplicationId === application.id && !resume.isMaster,
      );

    if (alreadyTailored) return;

    const created = tailorResume({
      masterId: master.id,
      applicationId: application.id,
      name: `${listing.company} — ${listing.position}`,
    });

    if (created) {
      toast(
        existing
          ? `Started a tailored resume for ${listing.company}`
          : `Saved to wishlist and started a tailored resume`,
      );
    }
  };

  const totalPages = data
    ? Math.max(1, Math.ceil(total / data.pageSize))
    : 1;
  const filtersActive =
    query.trim() !== "" ||
    company !== "all" ||
    family !== null ||
    workMode !== "all" ||
    posted !== DEFAULT_POSTED_WINDOW;

  return (
    <>
      <PageHeader
        title="Discover Jobs"
        actions={
          <SegmentedControl<SortMode>
            ariaLabel="Sort results"
            value={sort}
            onChange={setSort}
            segments={[
              { value: "newest", label: "Newest" },
              { value: "match", label: "Best match" },
            ]}
          />
        }
      />

      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search
              size={15}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle"
            />
            <TextInput
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search role, team, or city"
              aria-label="Search job postings"
              className="pl-9"
            />
          </div>

          <Select
            value={company}
            onChange={(event) => {
              setCompany(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by company"
            className="w-auto"
          >
            <option value="all">All companies</option>
            {COMPANIES.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </Select>

          <SegmentedControl<string>
            ariaLabel="Posted date"
            value={postedWindowParam(posted)}
            onChange={(next) => {
              setPosted(parsePostedWindow(next || null));
              setPage(1);
            }}
            segments={POSTED_FILTERS.map((item) => ({
              value: item.param,
              label: item.label,
            }))}
          />

          {filtersActive ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuery("");
                setCompany("all");
                setFamily(null);
                setWorkMode("all");
                setPosted(DEFAULT_POSTED_WINDOW);
                setPage(1);
              }}
            >
              <X size={14} aria-hidden="true" />
              Clear filters
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <FilterChip
            active={workMode === "all"}
            onClick={() => {
              setWorkMode("all");
              setPage(1);
            }}
          >
            Any workplace
          </FilterChip>
          {WORK_MODE_FILTERS.map((mode) => (
            <FilterChip
              key={mode}
              active={workMode === mode}
              onClick={() => {
                setWorkMode(mode);
                setPage(1);
              }}
            >
              {WORK_MODE_CHIP[mode]}
            </FilterChip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <FilterChip
            active={family === null}
            onClick={() => {
              setFamily(null);
              setPage(1);
            }}
          >
            All fields
          </FilterChip>
          {JOB_FAMILIES.map((item) => {
            const count = familyCounts[item] ?? 0;
            if (count === 0 && family !== item) return null;

            return (
              <FilterChip
                key={item}
                active={family === item}
                onClick={() => {
                  setFamily(family === item ? null : item);
                  setPage(1);
                }}
              >
                {item}
                <span className="ml-1 text-ink-subtle">{count}</span>
              </FilterChip>
            );
          })}
        </div>

        {!master ? (
          <p className="rounded-lg bg-surface-muted/60 px-3 py-2 text-xs text-ink-muted">
            Build a{" "}
            <Link href="/resumes" className="font-medium text-brand underline">
              master resume
            </Link>{" "}
            and every posting here gets a keyword match score against it.
          </p>
        ) : null}

        {data?.failedCompanies.length ? (
          <p className="flex items-center gap-2 rounded-lg bg-accent-soft px-3 py-2 text-xs text-accent">
            <TriangleAlert size={14} aria-hidden="true" />
            Could not reach {data.failedCompanies.join(", ")}. Showing everything
            else.
          </p>
        ) : null}
      </div>

      {error ? (
        <EmptyState
          icon={<TriangleAlert size={20} aria-hidden="true" />}
          title="Job search is unavailable"
          description={error}
          action={
            <Button
              variant="secondary"
              onClick={() => setRetry((current) => current + 1)}
            >
              Try again
            </Button>
          }
        />
      ) : loading && !data ? (
        <ResultsSkeleton />
      ) : results.length === 0 ? (
        <EmptyState
          icon={<Compass size={20} aria-hidden="true" />}
          title="No openings match those filters"
          description="Try a broader search term, a wider posted window, a different company, or clear the filters."
        />
      ) : (
        <>
          <div
            className={cn(
              "grid gap-4 sm:grid-cols-2 xl:grid-cols-3",
              loading && "opacity-60 transition-opacity",
            )}
          >
            {results.map(({ listing, score }) => (
              <JobCard
                key={listing.id}
                listing={listing}
                score={score}
                tracked={trackedUrls.has(normalizeUrl(listing.url))}
                hasMaster={Boolean(master)}
                hasTailored={tailoredByUrl.has(normalizeUrl(listing.url))}
                onOpen={() => handleOpenApplication(listing)}
                onAdd={() => handleAdd(listing)}
                onOpenResume={() => handleOpenResume(listing)}
              />
            ))}
          </div>

          <DiscoverResumeDock
            listing={resumeListing}
            open={resumeListing !== null}
            onClose={() => setResumeListing(null)}
          />

          {totalPages > 1 ? (
            <nav
              aria-label="Results pages"
              className="mt-5 flex items-center justify-center gap-3"
            >
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft size={14} aria-hidden="true" />
                Previous
              </Button>
              <span className="font-numeral text-xs text-ink-muted">
                Page {page} of {totalPages.toLocaleString()}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
              >
                Next
                <ChevronRight size={14} aria-hidden="true" />
              </Button>
            </nav>
          ) : null}
        </>
      )}
    </>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "chip-tone rounded-full px-2.5 py-1 text-xs font-medium",
        active
          ? "bg-brand-soft text-brand-on-soft"
          : "bg-surface-muted text-ink-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function ResultsSkeleton() {
  return (
    <div
      role="status"
      aria-label="Searching job boards"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-52" />
      ))}
    </div>
  );
}
