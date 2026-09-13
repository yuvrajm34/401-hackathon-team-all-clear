"use client";

import { Bell, Calendar, FileText, Mail, MapPin } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { cn } from "@/lib/cn";
import { formatRelativeDay, formatShortDate, todayIso } from "@/lib/dates";
import { STAGE_META, WORK_MODE_LABELS } from "@/lib/stages";
import { STAGES, type Application, type Stage } from "@/lib/types";

import type { ApplicationCardMeta } from "./ApplicationCard";
import { StageSelect } from "./StageBadge";

/**
 * Mobile stand-in for the Kanban board. The board's own horizontal
 * column-scroll and card-dragging both compete with the swipe-to-change-page
 * gesture for the exact same motion, so on mobile "Board" means this
 * instead: a stage tab strip plus one vertical, full-width list for
 * whichever stage is selected. Moving a card between stages goes through
 * `StageSelect` (a plain dropdown) rather than a drag.
 */
export function MobileStageBoard({
  applications,
  metaFor,
  onMove,
}: {
  applications: Application[];
  metaFor: (application: Application) => ApplicationCardMeta;
  onMove: (id: string, stage: Stage) => void;
}) {
  const [activeStage, setActiveStage] = useState<Stage>("wishlist");
  const visible = applications.filter((a) => a.stage === activeStage);

  return (
    <div className="flex flex-col gap-3">
      <div
        data-swipe-ignore
        className="scrollbar-slim -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1"
      >
        {STAGES.map((stage) => {
          const meta = STAGE_META[stage];
          const count = applications.filter((a) => a.stage === stage).length;
          const active = stage === activeStage;
          return (
            <button
              key={stage}
              type="button"
              onClick={() => setActiveStage(stage)}
              aria-pressed={active}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                active
                  ? "border-brand bg-brand-soft text-brand-on-soft"
                  : "border-line bg-surface text-ink-muted",
              )}
            >
              <span
                className={cn("h-1.5 w-1.5 rounded-full", meta.dot)}
                aria-hidden="true"
              />
              {meta.label}
              <span className={active ? "text-brand-on-soft/70" : "text-ink-subtle"}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl bg-surface-muted/80 px-4 py-8 text-center text-xs text-ink-subtle">
          {STAGE_META[activeStage].hint}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((application) => (
            <li key={application.id}>
              <MobileApplicationRow
                application={application}
                meta={metaFor(application)}
                onMove={(stage) => onMove(application.id, stage)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MobileApplicationRow({
  application,
  meta,
  onMove,
}: {
  application: Application;
  meta: ApplicationCardMeta;
  onMove: (stage: Stage) => void;
}) {
  return (
    <article className="rounded-[1.75rem] bg-surface p-3 shadow-card">
      <Link
        href={`/applications/${application.id}`}
        className="block min-w-0 rounded-sm"
      >
        <h3 className="truncate text-sm font-semibold text-ink">
          {application.company}
        </h3>
        <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">
          {application.position}
        </p>
      </Link>

      <dl className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-ink-subtle">
        {application.dateApplied ? (
          <div className="flex items-center gap-1">
            <Calendar size={11} aria-hidden="true" />
            <dt className="sr-only">
              {application.stage === "wishlist" ? "Target date" : "Applied"}
            </dt>
            <dd>{formatShortDate(application.dateApplied)}</dd>
          </div>
        ) : null}

        {application.location ? (
          <div className="flex min-w-0 items-center gap-1">
            <MapPin size={11} aria-hidden="true" />
            <dt className="sr-only">Location</dt>
            <dd className="truncate">
              {application.location}
              {application.workMode !== "unknown"
                ? ` · ${WORK_MODE_LABELS[application.workMode]}`
                : ""}
            </dd>
          </div>
        ) : null}

        {meta.messages > 0 ? (
          <div className="flex items-center gap-1">
            <Mail size={11} aria-hidden="true" />
            <dt className="sr-only">Logged messages</dt>
            <dd>{meta.messages}</dd>
          </div>
        ) : null}

        {meta.reminders > 0 ? (
          <div className="flex items-center gap-1">
            <Bell size={11} aria-hidden="true" />
            <dt className="sr-only">Open reminders</dt>
            <dd>{meta.reminders}</dd>
          </div>
        ) : null}
      </dl>

      {meta.resumeName || application.tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {meta.resumeName ? (
            <span className="inline-flex max-w-full items-center gap-1 text-[10px] text-ink-muted">
              <FileText size={10} aria-hidden="true" />
              <span className="truncate">{meta.resumeName}</span>
            </span>
          ) : null}
          {application.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="chip-tone rounded-lg bg-accent-soft px-1.5 py-0.5 text-[10px] text-accent-on-soft"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5">
        <StageSelect
          value={application.stage}
          ariaLabel={`Move ${application.company} to a different stage`}
          onChange={onMove}
        />
        {meta.followUpDue ? (
          <span className="chip-tone rounded-lg bg-negative-soft px-1.5 py-0.5 text-[10px] font-medium text-negative">
            Follow up{" "}
            {formatRelativeDay(application.followUpDate || todayIso())}
          </span>
        ) : null}
      </div>
    </article>
  );
}
