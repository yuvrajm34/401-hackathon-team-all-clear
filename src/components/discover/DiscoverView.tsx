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
import type { JobListing, JobSearchResponse } from "@/lib/jobs/types";
import { normalizeUrl } from "@/lib/jobs/url";
import { buildMatchReport } from "@/lib/keywords";
import { resumeText } from "@/lib/resume";
import { selectMasterResume, useAppStore } from "@/store/useAppStore";

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
  const tailorResume = useAppStore((state) => state.tailorResume);

  const [query, setQuery] = useState("");
  const [company, setCompany] = useState("all");
  const [family, setFamily] = useState<JobFamily | null>(null);
  const [remoteOnly, setRemoteOnly] = useState(false);
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
    if (remoteOnly) params.set("remote", "1");
    if (page > 1) params.set("page", String(page));
    return params.toString();
  }, [debouncedQuery, company, family, remoteOnly, page]);

  /** Identifies a request, so a retry counts as a new one. */
  const requestKey = `${retry}:${queryString}`;

  /**
   * Holds the last request that finished, tagged with the key it answered.
   * Loading is derived by comparing that key against the current one rather
   * than tracked in its own state, which keeps the previous page on screen
   * (dimmed) while the next one loads.
   */
  const [result, setResult] = useState<{
    key: string;
    data: JobSearchResponse | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      try {
        const response = await fetch(`/api/jobs?${queryString}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(body?.error ?? `Search failed (${response.status})`);
        }

        const payload = (await response.json()) as JobSearchResponse;
        setResult({ key: requestKey, data: payload, error: null });
      } catch (cause) {
        if (controller.signal.aborted) return;
        setResult({
          key: requestKey,
          data: null,
          error:
            cause instanceof Error
              ? cause.message
              : "Could not reach the job board.",
        });
      }
    };

    void run();

    return () => controller.abort();
  }, [queryString, requestKey]);

  const loading = result?.key !== requestKey;
  const data = result?.data ?? null;
  const error = result?.error ?? null;

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

  const results = useMemo(() => {
    const scored = (data?.jobs ?? []).map((listing) => ({
      listing,
      score: masterText
        ? buildMatchReport(listing.description, masterText).score
        : null,
    }));

    if (sort === "match") {
      scored.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    }

    return scored;
  }, [data, masterText, sort]);

  /** Ensures a listing has a tracked application, then opens the same
   * detail page an application gets from the Applications list — importing
   * it first if this is the first time it's been opened from here. */
  const handleOpenApplication = (listing: JobListing) => {
    const target = normalizeUrl(listing.url);
    const existing = applications.find(
      (application) =>
        application.url && normalizeUrl(application.url) === target,
    );
    const applicationId = existing?.id ?? importJobListing(listing);
    if (!applicationId) return;
    router.push(`/applications/${applicationId}`);
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

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const filtersActive =
    query.trim() !== "" || company !== "all" || family !== null || remoteOnly;

  return (
    <>
      <PageHeader
        eyebrow="Live from Greenhouse"
        title="Discover"
        description={
          data
            ? `${data.total.toLocaleString()} open roles across ${COMPANIES.length} companies, scored against your master resume.`
            : `Search real openings across ${COMPANIES.length} companies hiring through Greenhouse.`
        }
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

          <button
            type="button"
            aria-pressed={remoteOnly}
            onClick={() => {
              setRemoteOnly((current) => !current);
              setPage(1);
            }}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition",
              remoteOnly
                ? "border-brand bg-brand-soft text-brand-ink"
                : "border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink",
            )}
          >
            Remote only
          </button>

          {filtersActive ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuery("");
                setCompany("all");
                setFamily(null);
                setRemoteOnly(false);
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
            active={family === null}
            onClick={() => {
              setFamily(null);
              setPage(1);
            }}
          >
            All fields
          </FilterChip>
          {JOB_FAMILIES.map((item) => {
            const count = data?.familyCounts[item] ?? 0;
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
          description="Try a broader search term, a different company, or clear the filters."
        />
      ) : (
        <>
          <div
            className={cn(
              "grid gap-3 sm:grid-cols-2 xl:grid-cols-3",
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
              <span className="text-xs text-ink-muted">
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
        "rounded-full border px-2.5 py-1 text-xs font-medium transition",
        active
          ? "border-brand bg-brand-soft text-brand-ink"
          : "border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink",
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
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-52" />
      ))}
    </div>
  );
}
