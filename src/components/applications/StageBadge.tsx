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
        "chip-tone inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-medium tracking-wide",
        meta.badge,
        className,
      )}
    >
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
        "cursor-pointer rounded-xl border-0 bg-surface-muted px-2.5 py-1 text-xs font-medium text-ink transition",
        "hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-brand/30",
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
                "chip-tone rounded-full px-2.5 py-1.5 text-[13px] font-medium",
                isCurrent && "bg-brand-soft text-brand-on-soft",
                !isCurrent && isPast && "text-ink-muted",
                !isCurrent && !isPast && "text-ink-subtle hover:text-ink",
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
