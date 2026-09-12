"use client";

import { Flame } from "lucide-react";

import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { cn } from "@/lib/cn";
import type { MomentumStats } from "@/lib/stats";

/**
 * Weekly goal, streak, and an eight-week bar chart. The point is momentum:
 * applying is a habit, and a visible streak is the cheapest nudge there is.
 */
export function MomentumCard({ momentum }: { momentum: MomentumStats }) {
  const { thisWeek, weeklyGoal, goalProgress, streakDays, weeks, bestWeek } =
    momentum;
  const remaining = Math.max(0, weeklyGoal - thisWeek);
  const scaleMax = Math.max(bestWeek, weeklyGoal, 1);

  return (
    <Panel>
      <PanelHeader
        title="Momentum"
        description="Applications sent per week."
        action={
          streakDays > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
              <Flame size={12} aria-hidden="true" />
              {streakDays} day streak
            </span>
          ) : null
        }
      />
      <PanelBody className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3.5">
          <ProgressRing
            value={goalProgress}
            size={88}
            label={`${thisWeek} of ${weeklyGoal} applications this week`}
            indicatorClassName={goalProgress >= 100 ? "stroke-positive" : undefined}
          >
            <span className="text-xl font-semibold tabular-nums text-ink">
              {thisWeek}
            </span>
            <span className="text-[10px] text-ink-subtle">of {weeklyGoal}</span>
          </ProgressRing>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">
              {goalProgress >= 100
                ? "Weekly goal hit"
                : `${remaining} to go this week`}
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {goalProgress >= 100
                ? "Anything past this is a bonus."
                : `Target is ${weeklyGoal} per week. Adjust it in Settings.`}
            </p>
          </div>
        </div>

        <div className="flex-1">
          <ul className="flex items-end justify-between gap-1.5" aria-hidden="true">
            {weeks.map((week, index) => {
              const height = Math.max(
                4,
                Math.round((week.count / scaleMax) * 64),
              );
              const isCurrent = index === weeks.length - 1;
              return (
                <li
                  key={week.weekStart}
                  className="flex min-w-0 flex-1 flex-col items-center gap-1"
                >
                  <span className="text-[10px] tabular-nums text-ink-subtle">
                    {week.count || ""}
                  </span>
                  <span
                    style={{ height }}
                    className={cn(
                      "w-full rounded-t transition-[height] duration-700",
                      week.count === 0
                        ? "bg-surface-muted"
                        : isCurrent
                          ? "bg-brand"
                          : "bg-brand/45",
                    )}
                  />
                  <span className="truncate text-[9px] text-ink-subtle">
                    {week.label}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="sr-only">
            {weeks
              .map((week) => `Week of ${week.label}: ${week.count} applications`)
              .join(". ")}
          </p>
        </div>
      </PanelBody>
    </Panel>
  );
}
