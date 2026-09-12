"use client";

import { useDraggable } from "@dnd-kit/core";
import {
  Bell,
  Calendar,
  FileText,
  GripVertical,
  Mail,
  MapPin,
  MoveRight,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode, Ref } from "react";

import { cn } from "@/lib/cn";
import { formatRelativeDay, formatShortDate, todayIso } from "@/lib/dates";
import { STAGE_META, WORK_MODE_LABELS } from "@/lib/stages";
import { STAGES, type Application, type Stage } from "@/lib/types";

export interface ApplicationCardMeta {
  /** Number of logged messages. */
  messages: number;
  /** Open reminders. */
  reminders: number;
  resumeName?: string;
  followUpDue: boolean;
}

/** Draggable card used inside the Kanban columns. */
export function ApplicationCard({
  application,
  meta,
  onMove,
}: {
  application: Application;
  meta: ApplicationCardMeta;
  onMove: (stage: Stage) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: application.id });

  return (
    <CardShell
      application={application}
      meta={meta}
      onMove={onMove}
      nodeRef={setNodeRef}
      dragging={isDragging}
      style={
        transform
          ? {
              transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
              zIndex: 40,
            }
          : undefined
      }
      dragHandle={
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Drag ${application.company} to another stage`}
          // Always visible on touch layouts, where there is no hover to reveal it.
          className="flex h-7 w-5 cursor-grab touch-none items-center justify-center rounded text-ink-subtle transition hover:text-ink active:cursor-grabbing md:opacity-0 md:focus-visible:opacity-100 md:group-hover:opacity-100"
        >
          <GripVertical size={14} aria-hidden="true" />
        </button>
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
  onMove,
  nodeRef,
  style,
  dragging = false,
  dragHandle,
}: {
  application: Application;
  meta: ApplicationCardMeta;
  onMove?: (stage: Stage) => void;
  nodeRef?: Ref<HTMLElement>;
  style?: CSSProperties;
  dragging?: boolean;
  dragHandle?: ReactNode;
}) {
  const stageMeta = STAGE_META[application.stage];

  return (
    <article
      ref={nodeRef}
      style={style}
      className={cn(
        "group relative rounded-lg border border-line border-l-2 bg-surface p-3 shadow-xs transition",
        stageMeta.rail,
        dragging
          ? "rotate-1 scale-[1.02] cursor-grabbing shadow-card"
          : "hover:border-line-strong hover:shadow-card",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/applications/${application.id}`}
          className="min-w-0 flex-1 rounded-sm"
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
        </Link>

        <div className="flex shrink-0 items-center">
          {onMove ? (
            <MoveMenu currentStage={application.stage} onMove={onMove} />
          ) : null}
          {dragHandle}
        </div>
      </div>

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
            <span className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent">
              Follow up {formatRelativeDay(application.followUpDate || todayIso())}
            </span>
          ) : null}

          {meta.resumeName ? (
            <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-surface-muted px-1.5 py-0.5 text-[10px] text-ink-muted">
              <FileText size={10} aria-hidden="true" />
              <span className="truncate">{meta.resumeName}</span>
            </span>
          ) : null}

          {application.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-medium text-brand-ink"
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
    1: "bg-ink-subtle/40",
    2: "bg-brand/50",
    3: "bg-accent",
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

/**
 * Keyboard-accessible alternative to dragging. Pointer drag is the fast path;
 * this menu makes every move reachable without a mouse.
 */
function MoveMenu({
  currentStage,
  onMove,
}: {
  currentStage: Stage;
  onMove: (stage: Stage) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Move ${STAGE_META[currentStage].label} application to another stage`}
        className={cn(
          "flex h-7 w-6 items-center justify-center rounded text-ink-subtle transition hover:text-ink",
          // Hidden until hover on desktop; always available on touch layouts.
          open
            ? "opacity-100"
            : "md:opacity-0 md:focus-visible:opacity-100 md:group-hover:opacity-100",
        )}
      >
        <MoveRight size={14} aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          className="animate-pop absolute right-0 top-7 z-50 w-40 overflow-hidden rounded-lg border border-line bg-surface-raised p-1 shadow-card"
        >
          {STAGES.filter((stage) => stage !== currentStage).map((stage) => (
            <button
              key={stage}
              type="button"
              role="menuitem"
              onClick={() => {
                onMove(stage);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-ink transition hover:bg-surface-muted"
            >
              <span
                className={cn("h-1.5 w-1.5 rounded-full", STAGE_META[stage].dot)}
                aria-hidden="true"
              />
              Move to {STAGE_META[stage].label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
