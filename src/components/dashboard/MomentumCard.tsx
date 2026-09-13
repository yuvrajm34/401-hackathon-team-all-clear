"use client";

import { Flame } from "lucide-react";

import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { Sparkline } from "@/components/ui/Sparkline";
import { cn } from "@/lib/cn";
import { addDays, formatShortDate } from "@/lib/dates";
import type { MomentumStats } from "@/lib/stats";

/**
 * Weekly goal as a tally plus an eight-week bar chart. Interview-rate
 * n≥3 gating lives on the resume performance panel, not here.
 */
export function MomentumCard({ momentum }: { momentum: MomentumStats }) {
  const { thisWeek, weeklyGoal, goalProgress, streakDays, weeks } = momentum;
  const remaining = Math.max(0, weeklyGoal - thisWeek);
  const slots = Math.max(weeklyGoal, 1);
  const current = weeks[weeks.length - 1];
  const weekRange = current
    ? `${formatShortDate(current.weekStart)}–${formatShortDate(addDays(current.weekStart, 6))}`
    : null;

  return (
    <Panel>
      <PanelHeader
        title={
          <span className="inline-flex items-center gap-1.5">
            Momentum
            <Flame
              size={18}
              aria-hidden="true"
              className={streakDays > 0 ? "text-negative" : "text-ink-subtle"}
            />
          </span>
        }
        description={
          weekRange
            ? `Applications sent per week · ${weekRange}`
            : "Applications sent per week."
        }
        action={
          streakDays > 0 ? (
            <span className="font-numeral text-[11px] text-ink-muted">
              {streakDays} day{streakDays === 1 ? "" : "s"} in a row
            </span>
          ) : (
            <span className="text-[11px] text-ink-subtle">No streak yet</span>
          )
        }
      />
      <PanelBody className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div>
          <p className="font-numeral text-[28px] font-semibold leading-none text-ink">
            {thisWeek}
            <span className="text-[13px] font-medium text-ink-muted">
              {" "}
              of {weeklyGoal}
            </span>
          </p>
          <p className="mt-2 text-[13px] text-ink">
            {goalProgress >= 100
              ? "Weekly goal hit"
              : `${remaining} to go this week`}
          </p>
          <p className="mt-1 text-[11px] text-ink-muted">
            {goalProgress >= 100
              ? "Anything past this is a bonus."
              : `Target is ${weeklyGoal} per week. Adjust it in Settings.`}
          </p>
          <ol
            className="mt-3 flex gap-1"
            aria-label={`${thisWeek} of ${weeklyGoal} applications this week`}
          >
            {Array.from({ length: slots }, (_, index) => (
              <li
                key={index}
                className={cn(
                  "h-2 w-4 rounded-full",
                  index < thisWeek ? "bg-brand" : "bg-surface-muted",
                )}
              />
            ))}
          </ol>
        </div>

        <div className="min-w-0 flex-1">
          <Sparkline
            values={weeks.map((week) => week.count)}
            labels={weeks.map((week) => week.label)}
            className="h-24 text-brand"
            label={weeks
              .map(
                (week) =>
                  `Week of ${week.label}: ${week.count} applications`,
              )
              .join(". ")}
          />
          <p className="mt-1 text-[11px] text-ink-subtle">
            Week starting date, oldest to this week.
          </p>
        </div>
      </PanelBody>
    </Panel>
  );
}
