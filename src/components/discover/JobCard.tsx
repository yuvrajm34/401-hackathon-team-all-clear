"use client";

import {
  ArrowUpRight,
  Building2,
  Check,
  ExternalLink,
  FileText,
  MapPin,
  Plus,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatRelativeDay } from "@/lib/dates";
import type { JobListing } from "@/lib/jobs/types";
import { matchSignal, scoreLabel } from "@/lib/keywords";
import { WORK_MODE_LABELS } from "@/lib/stages";

export function JobCard({
  listing,
  score,
  tracked,
  hasMaster,
  hasTailored,
  onOpen,
  onAdd,
  onOpenResume,
}: {
  listing: JobListing;
  /** `null` when there is no master resume to compare against. */
  score: number | null;
  tracked: boolean;
  hasMaster: boolean;
  hasTailored: boolean;
  /** Opens (creating the application first if needed) the same detail page
   * an application gets from the Applications list. */
  onOpen: () => void;
  onAdd: () => void;
  onOpenResume: () => void;
}) {
  return (
    <article className="flex flex-col rounded-[1.75rem] bg-surface p-4 shadow-card transition-[box-shadow] duration-200 ease-[var(--ease-emphasized)] hover:shadow-raised">
      <button
        type="button"
        onClick={onOpen}
        className="w-full rounded-sm text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="flex min-w-0 items-start gap-1.5 text-sm font-semibold leading-snug text-ink">
            <span>{listing.position}</span>
            {tracked ? (
              <Check
                size={14}
                aria-label="In your pipeline"
                className="mt-0.5 shrink-0 text-ink"
              />
            ) : null}
          </h3>
          <span className="flex shrink-0 items-center gap-2">
            {score !== null ? <MatchPill score={score} /> : null}
            <ArrowUpRight
              size={16}
              aria-hidden="true"
              className="text-ink-subtle"
            />
          </span>
        </div>

        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1">
            <Building2 size={12} aria-hidden="true" />
            {listing.company}
          </span>
          {listing.location ? (
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} aria-hidden="true" />
              {listing.location}
            </span>
          ) : null}
        </p>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {listing.workMode !== "unknown" ? (
            <Badge tone="neutral">
              {WORK_MODE_LABELS[listing.workMode]}
            </Badge>
          ) : null}
          {listing.department ? <Badge>{listing.department}</Badge> : null}
          {listing.postedAt ? (
            <span className="text-[11px] text-ink-subtle">
              Posted {formatRelativeDay(listing.postedAt)}
            </span>
          ) : null}
        </div>
      </button>

      <div
        className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3"
        onClick={(event) => event.stopPropagation()}
      >
        {tracked ? (
          <span className="text-xs text-ink-muted">In pipeline</span>
        ) : (
          <Button size="sm" variant="secondary" onClick={onAdd}>
            <Plus size={14} aria-hidden="true" />
            Add to wishlist
          </Button>
        )}

        <Button
          size="sm"
          variant={hasMaster ? "primary" : "secondary"}
          onClick={onOpenResume}
        >
          <FileText size={14} aria-hidden="true" />
          {!hasMaster
            ? "Start a master resume"
            : hasTailored
              ? "Continue tailored resume"
              : "Tailor a resume"}
        </Button>

        <a
          href={listing.url}
          target="_blank"
          rel="noreferrer noopener"
          className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink hover:underline"
        >
          View posting
          <ExternalLink size={12} aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}

function MatchPill({ score }: { score: number }) {
  const { label } = scoreLabel(score);
  const signal = matchSignal(score);

  return (
    <span
      title={`${label} against your master resume`}
      className={cn(
        "chip-tone font-numeral shrink-0 rounded-lg px-2 py-0.5 text-[13px] font-medium",
        signal === "positive" && "bg-positive-soft text-positive",
        signal === "negative" && "bg-negative-soft text-negative",
        signal === "neutral" && "bg-accent-soft text-accent-on-soft",
      )}
    >
      {score}
      <span className="ml-1 text-[11px] font-medium">match</span>
    </span>
  );
}
