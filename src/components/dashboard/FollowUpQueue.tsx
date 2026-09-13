"use client";

import { BellRing, Check, ChevronRight, Clock } from "lucide-react";
import Link from "next/link";

import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import { formatRelativeDay } from "@/lib/dates";
import type { NudgeItem, UpcomingReminder } from "@/lib/stats";
import { useAppStore } from "@/store/useAppStore";

/** Applications that have gone quiet, plus every open reminder that is due. */
export function FollowUpQueue({
  nudges,
  reminders,
}: {
  nudges: NudgeItem[];
  reminders: UpcomingReminder[];
}) {
  const toggleReminder = useAppStore((state) => state.toggleReminder);
  const total = nudges.length + reminders.length;

  return (
    <Panel>
      <PanelHeader
        title="Needs your attention"
        description={
          total === 0
            ? "Nothing is waiting on you right now."
            : `${total} item${total === 1 ? "" : "s"} to handle.`
        }
      />
      <PanelBody className="space-y-3">
        {total === 0 ? (
          <p className="text-xs text-positive">
            All clear. Every application has either had a reply or is still
            inside its waiting window.
          </p>
        ) : null}

        {nudges.length > 0 ? (
          <section>
            <h3 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-subtle">
              <Clock size={11} aria-hidden="true" />
              Gone quiet
            </h3>
            <ul className="space-y-1.5">
              {nudges.slice(0, 5).map(({ application, waitingDays, reason }) => (
                <li key={application.id}>
                  <Link
                    href={`/applications/${application.id}`}
                    className="flex items-center gap-2 rounded-xl bg-negative-soft/70 px-2.5 py-2 transition hover:bg-negative-soft"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-ink">
                        {application.company}
                      </p>
                      <p className="truncate text-[11px] text-negative">
                        {reason === "follow-up-due"
                          ? `Follow-up planned ${formatRelativeDay(
                              application.followUpDate,
                            )}`
                          : `No reply after ${waitingDays} days`}
                      </p>
                    </div>
                    <ChevronRight
                      size={14}
                      aria-hidden="true"
                      className="shrink-0 text-ink-subtle"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {reminders.length > 0 ? (
          <section>
            <h3 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-subtle">
              <BellRing size={11} aria-hidden="true" />
              Reminders
            </h3>
            <ul className="space-y-1.5">
              {reminders.map(({ reminder, application, overdue }) => (
                <li
                  key={reminder.id}
                  className="flex items-center gap-2 rounded-xl bg-surface-muted px-2.5 py-2"
                >
                  <button
                    type="button"
                    onClick={() => toggleReminder(reminder.id)}
                    aria-label={`Mark "${reminder.title}" as done`}
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-surface transition hover:bg-positive-soft hover:text-positive"
                  >
                    <Check
                      size={10}
                      aria-hidden="true"
                      className="opacity-0 transition hover:opacity-100"
                    />
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-ink">{reminder.title}</p>
                    <p
                      className={cn(
                        "truncate text-[11px]",
                        overdue ? "font-medium text-negative" : "text-ink-subtle",
                      )}
                    >
                      {application ? `${application.company} · ` : ""}
                      due {formatRelativeDay(reminder.dueDate)}
                    </p>
                  </div>

                  {application ? (
                    <Link
                      href={`/applications/${application.id}`}
                      aria-label={`Open ${application.company}`}
                      className="shrink-0 rounded p-1 text-ink-subtle transition hover:text-brand"
                    >
                      <ChevronRight size={14} aria-hidden="true" />
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </PanelBody>
    </Panel>
  );
}
