"use client";

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import {
  ChevronDown,
  Eye,
  EyeOff,
  GripHorizontal,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Shared chrome for every repeatable resume entry: collapse, show/hide,
 * reorder, delete, and the "changed from master" badge with a reset action.
 */
export function ItemShell({
  title,
  subtitle,
  enabled,
  onToggleEnabled,
  onDelete,
  onMoveUp,
  onMoveDown,
  changed = false,
  onReset,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  enabled: boolean;
  onToggleEnabled: () => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  changed?: boolean;
  onReset?: () => void;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        "rounded-lg border bg-surface transition",
        enabled ? "border-line" : "border-dashed border-line-strong opacity-70",
      )}
    >
      <div className="flex items-center gap-1 px-2 py-1.5">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1 py-1 text-left transition hover:bg-surface-muted"
        >
          <ChevronDown
            size={14}
            aria-hidden="true"
            className={cn(
              "shrink-0 text-ink-subtle transition-transform",
              open && "rotate-180",
            )}
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-ink">
              {title || "Untitled"}
            </span>
            {subtitle ? (
              <span className="block truncate text-[11px] text-ink-subtle">
                {subtitle}
              </span>
            ) : null}
          </span>
          {changed ? (
            <span className="ml-1 shrink-0 rounded bg-brand-soft px-1.5 py-0.5 text-[10px] font-medium text-brand-ink">
              edited
            </span>
          ) : null}
        </button>

        <div className="flex shrink-0 items-center">
          {onMoveUp ? (
            <IconAction label={`Move ${title} up`} onClick={onMoveUp}>
              <ChevronDown size={13} className="rotate-180" aria-hidden="true" />
            </IconAction>
          ) : null}
          {onMoveDown ? (
            <IconAction label={`Move ${title} down`} onClick={onMoveDown}>
              <ChevronDown size={13} aria-hidden="true" />
            </IconAction>
          ) : null}
          {changed && onReset ? (
            <IconAction label={`Reset ${title} to the master version`} onClick={onReset}>
              <RotateCcw size={13} aria-hidden="true" />
            </IconAction>
          ) : null}
          <IconAction
            label={enabled ? `Hide ${title} from this resume` : `Show ${title}`}
            onClick={onToggleEnabled}
            active={!enabled}
          >
            {enabled ? (
              <Eye size={13} aria-hidden="true" />
            ) : (
              <EyeOff size={13} aria-hidden="true" />
            )}
          </IconAction>
          <IconAction label={`Delete ${title}`} onClick={onDelete} danger>
            <Trash2 size={13} aria-hidden="true" />
          </IconAction>
        </div>
      </div>

      {open ? (
        <div className="space-y-2 border-t border-line px-2.5 py-2.5">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function IconAction({
  label,
  onClick,
  children,
  danger = false,
  active = false,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md transition",
        danger
          ? "text-ink-subtle hover:bg-negative/10 hover:text-negative"
          : "text-ink-subtle hover:bg-surface-muted hover:text-ink",
        active && "text-brand",
      )}
    >
      {children}
    </button>
  );
}

export function SectionShell({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-surface-muted/30 p-3">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {description ? (
            <p className="text-[11px] text-ink-subtle">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

/** Reorders an array in place; used by every "move up/down" action. */
export function moveItem<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length) return;
  const [entry] = items.splice(from, 1);
  items.splice(to, 0, entry);
}

/**
 * Drag-to-reorder wrapper for a whole top-level resume section (Summary,
 * Experience, Projects, Education, Skills). `id` must match the string
 * used in the parent `SortableContext`'s `items` array. `@dnd-kit` handles
 * the live slide-into-place animation as items reorder — no extra
 * animation code needed here.
 */
export function SortableSection({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "z-20")}
    >
      <div
        {...attributes}
        {...listeners}
        role="button"
        tabIndex={0}
        aria-label="Drag to reorder this section"
        className="mb-1 flex h-5 touch-none cursor-grab items-center justify-center rounded-md text-ink-subtle/40 transition hover:bg-surface-muted hover:text-ink-subtle active:cursor-grabbing"
      >
        <GripHorizontal size={14} aria-hidden="true" />
      </div>
      <div className={cn(isDragging && "opacity-60")}>{children}</div>
    </div>
  );
}
