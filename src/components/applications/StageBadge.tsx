"use client";

import { cn } from "@/lib/cn";
import { STAGE_META } from "@/lib/stages";
import { STAGES, type Stage } from "@/lib/types";

export function StageBadge({
  stage,
  className,
}: {
  stage: Stage;
  className?: string;
}) {
  const meta = STAGE_META[stage];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        meta.badge,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

/** Compact stage picker used on the detail page and in the table rows. */
export function StageSelect({
  value,
  onChange,
  className,
  ariaLabel = "Stage",
}: {
  value: Stage;
  onChange: (stage: Stage) => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value as Stage)}
      className={cn(
        "cursor-pointer rounded-lg border border-line bg-surface px-2 py-1 text-xs font-medium text-ink transition",
        "hover:border-line-strong focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25",
        className,
      )}
    >
      {STAGES.map((stage) => (
        <option key={stage} value={stage}>
          {STAGE_META[stage].label}
        </option>
      ))}
    </select>
  );
}

/**
 * Horizontal progress stepper. Clicking a step moves the application there,
 * which is faster than dragging when you are already on the detail page.
 */
export function StageStepper({
  value,
  onChange,
}: {
  value: Stage;
  onChange: (stage: Stage) => void;
}) {
  const activeIndex = STAGES.indexOf(value);
  const closed = value === "rejected";

  return (
    <ol className="flex flex-wrap items-center gap-1.5">
      {STAGES.map((stage, index) => {
        const meta = STAGE_META[stage];
        const isCurrent = stage === value;
        const isPast = !closed && index < activeIndex;

        return (
          <li key={stage}>
            <button
              type="button"
              onClick={() => onChange(stage)}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-xs font-medium ring-1 ring-inset transition",
                isCurrent && meta.badge,
                !isCurrent && isPast && "bg-surface-muted text-ink-muted ring-line",
                !isCurrent &&
                  !isPast &&
                  "bg-surface text-ink-subtle ring-line hover:bg-surface-muted hover:text-ink",
              )}
            >
              {meta.label}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
