"use client";

import { useDraggable } from "@dnd-kit/core";
import { Bell, Calendar, FileText, Mail, MapPin } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { CSSProperties, MouseEvent, Ref } from "react";

import { cn } from "@/lib/cn";
import { formatRelativeDay, formatShortDate, todayIso } from "@/lib/dates";
import { WORK_MODE_LABELS } from "@/lib/stages";
import type { Application } from "@/lib/types";

import { StageBadge } from "./StageBadge";

export interface ApplicationCardMeta {
  /** Number of logged messages. */
  messages: number;
  /** Open reminders. */
  reminders: number;
  resumeName?: string;
  followUpDue: boolean;
}

/**
 * Draggable card used inside the Kanban columns. The whole card is the drag
 * handle — press and drag anywhere on it to move it between stages; a plain
 * click (no movement past the activation threshold) still opens the detail
 * page via the inner link.
 */
export function ApplicationCard({
  application,
  meta,
}: {
  application: Application;
  meta: ApplicationCardMeta;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: application.id });

  // A completed drag must not also trigger the card's link navigation. Track
  // it in a ref (not state) so the click handler sees it immediately —
  // `isDragging` flips true well before pointerup, so the ref is reliably
  // set by the time the browser's click event fires after drop.
  const draggedRef = useRef(false);
  useEffect(() => {
    if (isDragging) draggedRef.current = true;
  }, [isDragging]);

  return (
    <CardShell
      application={application}
      meta={meta}
      nodeRef={setNodeRef}
      dragging={isDragging}
      dragAttributes={attributes}
      dragListeners={listeners}
      onLinkClick={(event) => {
        if (draggedRef.current) {
          event.preventDefault();
          draggedRef.current = false;
        }
      }}
      style={
        transform
          ? {
              transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
              zIndex: 40,
            }
          : undefined
      }
    />
  );
}

/**
 * Static copy rendered inside `DragOverlay`. It deliberately skips
 * `useDraggable` so the dragged id is not registered twice in the same
 * DndContext.
 */
export function ApplicationCardPreview({
  application,
  meta,
}: {
  application: Application;
  meta: ApplicationCardMeta;
}) {
  return <CardShell application={application} meta={meta} dragging />;
}

function CardShell({
  application,
  meta,
  nodeRef,
  style,
  dragging = false,
  dragAttributes,
  dragListeners,
  onLinkClick,
}: {
  application: Application;
  meta: ApplicationCardMeta;
  nodeRef?: Ref<HTMLElement>;
  style?: CSSProperties;
  dragging?: boolean;
  dragAttributes?: ReturnType<typeof useDraggable>["attributes"];
  dragListeners?: ReturnType<typeof useDraggable>["listeners"];
  onLinkClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  // Presence of drag listeners distinguishes the in-column card (hidden while
  // dragging) from the static DragOverlay preview (which stays visible).
  const isSource = Boolean(dragListeners);

  return (
    <article
      ref={nodeRef}
      style={style}
      {...dragAttributes}
      {...dragListeners}
      aria-label={`${application.company}, ${application.position}. Press and drag, or use arrow keys, to move between stages.`}
      className={cn(
        "group relative touch-none select-none rounded-[1.75rem] bg-surface p-3 shadow-card transition-[box-shadow,transform] duration-200 ease-[var(--ease-emphasized)]",
        dragging && isSource
          ? "cursor-grabbing opacity-0"
          : dragging
            ? "cursor-grabbing shadow-raised"
            : "cursor-grab hover:shadow-raised",
      )}
    >
      <Link
        href={`/applications/${application.id}`}
        className="block min-w-0 rounded-sm"
        onClick={onLinkClick}
      >
        <div className="flex items-center gap-1.5">
          <PriorityDot priority={application.priority} />
          <h3 className="truncate text-sm font-semibold text-ink">
            {application.company}
          </h3>
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">
          {application.position}
        </p>
        <div className="mt-1.5">
          <StageBadge stage={application.stage} />
        </div>
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

      {application.tags.length > 0 || meta.resumeName || meta.followUpDue ? (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {meta.followUpDue ? (
            <span className="chip-tone inline-flex items-center gap-1 rounded-lg bg-negative-soft px-1.5 py-0.5 text-[10px] font-medium text-negative">
              Follow up {formatRelativeDay(application.followUpDate || todayIso())}
            </span>
          ) : null}

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
          {application.tags.length > 2 ? (
            <span className="text-[10px] text-ink-subtle">
              +{application.tags.length - 2}
            </span>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function PriorityDot({ priority }: { priority: 1 | 2 | 3 }) {
  const labels = { 1: "Low priority", 2: "Medium priority", 3: "High priority" };
  const colors = {
    1: "bg-ink-subtle",
    2: "bg-accent",
    3: "bg-brand",
  } as const;

  return (
    <span
      title={labels[priority]}
      className={cn("h-1.5 w-1.5 shrink-0 rounded-full", colors[priority])}
    >
      <span className="sr-only">{labels[priority]}</span>
    </span>
  );
}
