"use client";

import {
  Building2,
  Check,
  ChevronDown,
  ExternalLink,
  MapPin,
  Plus,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import type { JobListing } from "@/lib/jobs/types";
import { scoreLabel } from "@/lib/keywords";
import { WORK_MODE_LABELS } from "@/lib/stages";

export function JobCard({
  listing,
  score,
  tracked,
  onAdd,
}: {
  listing: JobListing;
  /** `null` when there is no master resume to compare against. */
  score: number | null;
  tracked: boolean;
  onAdd: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="flex flex-col rounded-xl border border-line bg-surface p-4 shadow-card transition hover:border-line-strong">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold leading-snug text-ink">
          {listing.position}
        </h3>
        {score !== null ? <MatchPill score={score} /> : null}
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
          <Badge tone={listing.workMode === "remote" ? "positive" : "neutral"}>
            {WORK_MODE_LABELS[listing.workMode]}
          </Badge>
        ) : null}
        {listing.department ? <Badge>{listing.department}</Badge> : null}
        {listing.postedAt ? (
          <span className="text-[11px] text-ink-subtle">
            Posted {formatDate(listing.postedAt)}
          </span>
        ) : null}
      </div>

      {listing.description ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
          >
            <ChevronDown
              size={13}
              aria-hidden="true"
              className={cn("transition-transform", expanded && "rotate-180")}
            />
            {expanded ? "Hide description" : "Show description"}
          </button>

          {expanded ? (
            <p className="mt-2 max-h-64 overflow-y-auto whitespace-pre-line rounded-lg bg-surface-muted/60 p-3 text-xs leading-relaxed text-ink-muted">
              {listing.description}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        {tracked ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-positive">
            <Check size={14} aria-hidden="true" />
            In your pipeline
          </span>
        ) : (
          <Button size="sm" onClick={onAdd}>
            <Plus size={14} aria-hidden="true" />
            Add to wishlist
          </Button>
        )}

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
  const { tone, label } = scoreLabel(score);

  return (
    <span
      title={`${label} against your master resume`}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        tone === "strong" && "bg-positive/10 text-positive ring-positive/25",
        tone === "fair" && "bg-accent-soft text-accent ring-accent/30",
        tone === "weak" && "bg-surface-muted text-ink-muted ring-line",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          tone === "strong" && "bg-positive",
          tone === "fair" && "bg-accent",
          tone === "weak" && "bg-ink-subtle",
        )}
      />
      {score}% match
    </span>
  );
}
