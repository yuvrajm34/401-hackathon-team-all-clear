"use client";

import { ExternalLink, Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { WORK_MODE_LABELS } from "@/lib/stages";
import type { JobListing } from "@/lib/jobs/types";
import type { Application, Resume } from "@/lib/types";

import { MatchPanel } from "./MatchPanel";

/**
 * Read-only look at a posting that isn't tracked anywhere yet — reached by
 * clicking a Discover card. Renders the same job-description and AI
 * tailoring panels as a real application's detail page, so browsing a
 * posting doesn't feel like a stripped-down experience, but nothing is
 * created in the pipeline until "Add to wishlist" is clicked here.
 */
export function JobPostingPreview({
  listing,
  resume,
  onAdd,
}: {
  listing: JobListing;
  resume: Resume | undefined;
  onAdd: () => void;
}) {
  // MatchPanel only ever reads `application.jobDescription` — everything
  // else on this synthetic object is unused filler so the shared component
  // can be reused without a real, persisted application existing yet.
  const draftApplication: Application = {
    id: listing.id,
    company: listing.company,
    position: listing.position,
    location: listing.location,
    workMode: listing.workMode,
    url: listing.url,
    salary: "",
    stage: "wishlist",
    dateApplied: "",
    followUpDate: "",
    jobDescription: listing.description,
    notes: "",
    tags: [],
    resumeId: null,
    priority: 2,
    createdAt: "",
    updatedAt: "",
  };

  return (
    <div className="space-y-4">
      <Link
        href="/discover"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition hover:text-ink"
      >
        Back to Discover
      </Link>

      <header className="brand-wash rounded-xl border border-line p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-balance text-xl font-semibold tracking-tight text-ink sm:text-2xl">
              {listing.company}
            </h1>
            <p className="mt-0.5 text-sm text-ink-muted">{listing.position}</p>
            <p className="mt-1 text-xs text-ink-subtle">
              {[
                listing.location,
                listing.workMode !== "unknown"
                  ? WORK_MODE_LABELS[listing.workMode]
                  : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={listing.url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-ink transition hover:bg-surface-muted"
            >
              <ExternalLink size={14} aria-hidden="true" />
              Posting
            </a>
            <Button onClick={onAdd}>
              <Plus size={14} aria-hidden="true" />
              Add to wishlist
            </Button>
          </div>
        </div>

        <p className="mt-4 text-xs text-ink-subtle">
          Not tracked yet — this is a preview. Add it to your wishlist to
          manage its stage, log messages, and attach a resume.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Panel>
            <PanelHeader
              title="Job description"
              description="Used for the keyword match score."
            />
            <PanelBody>
              {listing.description ? (
                <div className="whitespace-pre-wrap break-words text-xs leading-relaxed text-ink-muted">
                  {listing.description}
                </div>
              ) : (
                <p className="text-xs text-ink-subtle">
                  No description came with this posting. Open it on the
                  company site.
                </p>
              )}
            </PanelBody>
          </Panel>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <MatchPanel application={draftApplication} resume={resume} />
        </div>
      </div>
    </div>
  );
}
