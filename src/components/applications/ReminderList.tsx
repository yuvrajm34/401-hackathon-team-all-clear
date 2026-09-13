"use client";

import { BellPlus, Check, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import { addDays, formatRelativeDay, todayIso } from "@/lib/dates";
import type { Reminder } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

export function ReminderList({
  applicationId,
  reminders,
}: {
  applicationId: string;
  reminders: Reminder[];
}) {
  const addReminder = useAppStore((state) => state.addReminder);
  const toggleReminder = useAppStore((state) => state.toggleReminder);
  const deleteReminder = useAppStore((state) => state.deleteReminder);

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(() => addDays(todayIso(), 7));

  const today = todayIso();
  const ordered = [...reminders].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return a.dueDate.localeCompare(b.dueDate);
  });

  const submit = () => {
    if (!title.trim()) return;
    addReminder({ applicationId, title, dueDate: dueDate || today });
    setTitle("");
    setDueDate(addDays(today, 7));
  };

  return (
    <Panel>
      <PanelHeader
        title="Reminders"
        description="Follow-ups and prep tasks for this application."
      />
      <PanelBody className="space-y-3">
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <TextInput
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Send a thank-you note"
            aria-label="Reminder title"
            className="flex-1"
          />
          <TextInput
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            aria-label="Due date"
            className="sm:w-40"
          />
          <Button type="submit" variant="secondary" disabled={!title.trim()}>
            <BellPlus size={14} aria-hidden="true" />
            Add
          </Button>
        </form>

        {ordered.length === 0 ? (
          <p className="text-xs text-ink-subtle">
            No reminders yet. Anything due shows up on the dashboard.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {ordered.map((reminder) => {
              const overdue = !reminder.done && reminder.dueDate < today;
              return (
                <li
                  key={reminder.id}
                  className="flex items-center gap-2 rounded-xl bg-surface-muted px-2.5 py-2"
                >
                  <button
                    type="button"
                    onClick={() => toggleReminder(reminder.id)}
                    aria-pressed={reminder.done}
                    aria-label={
                      reminder.done
                        ? `Mark "${reminder.title}" as not done`
                        : `Mark "${reminder.title}" as done`
                    }
                    className={cn(
                      "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full transition",
                      reminder.done
                        ? "bg-positive text-white"
                        : "bg-surface hover:bg-brand-soft",
                    )}
                  >
                    {reminder.done ? (
                      <Check size={11} aria-hidden="true" />
                    ) : null}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate text-xs",
                        reminder.done
                          ? "text-ink-subtle line-through"
                          : "text-ink",
                      )}
                    >
                      {reminder.title}
                    </p>
                    <p
                      className={cn(
                        "text-[11px]",
                        overdue ? "font-medium text-negative" : "text-ink-subtle",
                      )}
                    >
                      Due {formatRelativeDay(reminder.dueDate)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteReminder(reminder.id)}
                    aria-label={`Delete reminder "${reminder.title}"`}
                    className="rounded p-1 text-ink-subtle transition hover:text-negative"
                  >
                    <Trash2 size={13} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PanelBody>
    </Panel>
  );
}
