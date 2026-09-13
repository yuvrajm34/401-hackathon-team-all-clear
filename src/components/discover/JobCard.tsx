"use client";

import {
  Building2,
  Check,
  ChevronDown,
  ExternalLink,
  FileText,
  MapPin,
  Plus,
} from "lucide-react";
import { useMemo } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import type { JobListing } from "@/lib/jobs/types";
import { buildMatchReport, scoreLabel } from "@/lib/keywords";
import { WORK_MODE_LABELS } from "@/lib/stages";

export function JobCard({
  listing,
  score,
  tracked,
  expanded,
  masterText,
  hasMaster,
  hasTailored,
  onToggle,
  onAdd,
  onOpenResume,
}: {
  listing: JobListing;
  /** `null` when there is no master resume to compare against. */
  score: number | null;
  tracked: boolean;
  expanded: boolean;
  masterText: string;
  hasMaster: boolean;
  hasTailored: boolean;
  onToggle: () => void;
  onAdd: () => void;
  onOpenResume: () => void;
}) {
  const report = useMemo(
    () =>
      expanded && listing.description
        ? buildMatchReport(listing.description, masterText)
        : null,
    [expanded, listing.description, masterText],
  );

  return (
    <article
      className={cn(
        "flex flex-col rounded-xl border bg-surface p-4 shadow-card transition",
        expanded
          ? "col-span-full border-brand"
          : "border-line hover:border-line-strong",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full rounded-sm text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold leading-snug text-ink">
            {listing.position}
          </h3>
          <span className="flex shrink-0 items-center gap-2">
            {score !== null ? <MatchPill score={score} /> : null}
            <ChevronDown
              size={16}
              aria-hidden="true"
              className={cn(
                "text-ink-subtle transition-transform",
                expanded && "rotate-180",
              )}
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
      </button>

      {expanded ? (
        <div className="mt-4 space-y-3 border-t border-line pt-3">
          {listing.description ? (
            <p className="max-h-72 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-ink-muted">
              {listing.description}
            </p>
          ) : (
            <p className="text-sm text-ink-subtle">
              No description came with this posting. Open it on the company
              site.
            </p>
          )}

          {report && !report.empty && report.missing.length > 0 ? (
            <p className="text-xs text-ink-subtle">
              Missing from your original:{" "}
              {report.missing
                .slice(0, 8)
                .map((hit) => hit.keyword)
                .join(", ")}
              {report.missing.length > 8 ? "…" : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      <div
        className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3"
        onClick={(event) => event.stopPropagation()}
      >
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

        <Button size="sm" variant="secondary" onClick={onOpenResume}>
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
