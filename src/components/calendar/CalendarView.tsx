"use client";

import {
  BellPlus,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { QuickAddButton } from "@/components/applications/QuickAddButton";
import { HydrationGate } from "@/components/layout/HydrationGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { TextInput, Select } from "@/components/ui/Field";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { toast } from "@/components/ui/Toaster";
import {
  CALENDAR_KIND_META,
  CALENDAR_KINDS,
  collectCalendarEvents,
  eventsInRange,
  eventsOnDay,
  overdueEvents,
  upcomingHorizon,
  type CalendarEvent,
  type CalendarKind,
} from "@/lib/calendar";
import { cn } from "@/lib/cn";
import {
  addDays,
  addMonths,
  buildMonthGrid,
  formatMonthYear,
  formatRelativeDay,
  formatShortDate,
  startOfMonth,
  todayIso,
  weekdayLabels,
} from "@/lib/dates";
import { useAppStore } from "@/store/useAppStore";

type Filter = "all" | CalendarKind;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "reminder", label: "Reminders" },
  { value: "follow-up", label: "Follow-ups" },
  { value: "interview", label: "Interviews" },
  { value: "applied", label: "Applied" },
];

export function CalendarView() {
  return (
    <HydrationGate>
      <CalendarInner />
    </HydrationGate>
  );
}

function CalendarInner() {
  const applications = useAppStore((state) => state.applications);
  const communications = useAppStore((state) => state.communications);
  const reminders = useAppStore((state) => state.reminders);
  const loadDemoData = useAppStore((state) => state.loadDemoData);
  const addReminder = useAppStore((state) => state.addReminder);
  const toggleReminder = useAppStore((state) => state.toggleReminder);
  const updateApplication = useAppStore((state) => state.updateApplication);

  const today = todayIso();
  const [month, setMonth] = useState(() => startOfMonth(today));
  const [selected, setSelected] = useState(today);
  const [filter, setFilter] = useState<Filter>("all");
  const [showDone, setShowDone] = useState(false);
  const [title, setTitle] = useState("");
  const [applicationId, setApplicationId] = useState("");

  const kinds = useMemo<ReadonlySet<CalendarKind>>(
    () => new Set(filter === "all" ? CALENDAR_KINDS : [filter]),
    [filter],
  );

  const events = useMemo(
    () => collectCalendarEvents(applications, communications, reminders),
    [applications, communications, reminders],
  );

  const cells = useMemo(() => buildMonthGrid(month), [month]);
  const weekdays = useMemo(() => weekdayLabels(), []);
  const horizon = upcomingHorizon(14);

  const selectedEvents = useMemo(
    () => eventsOnDay(events, selected, kinds, showDone),
    [events, selected, kinds, showDone],
  );
  const upcoming = useMemo(
    () => eventsInRange(events, horizon.from, horizon.to, kinds, showDone),
    [events, horizon.from, horizon.to, kinds, showDone],
  );
  const overdue = useMemo(
    () => overdueEvents(events, kinds),
    [events, kinds],
  );

  const openApplications = applications.filter(
    (application) => application.stage !== "rejected",
  );

  const goToday = () => {
    setMonth(startOfMonth(today));
    setSelected(today);
  };

  const submitReminder = () => {
    if (!title.trim() || !applicationId) return;
    addReminder({
      applicationId,
      title,
      dueDate: selected,
    });
    setTitle("");
    toast("Reminder added");
  };

  const snoozeFollowUp = (id: string) => {
    updateApplication(id, { followUpDate: addDays(today, 7) });
    toast("Follow-up moved a week");
  };

  if (applications.length === 0) {
    return (
      <>
        <PageHeader
          title="Calendar"
          description="Interviews, follow-ups, and reminders for every role you track."
        />
        <EmptyState
          icon={<CalendarDays size={20} aria-hidden="true" />}
          title="Nothing to put on a calendar yet"
          description="Add a role, or load the sample pipeline to see interviews and due dates on the month."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <QuickAddButton label="Add an application" />
              <Button
                variant="secondary"
                onClick={() => {
                  loadDemoData();
                  toast("Sample data loaded");
                }}
              >
                Load sample data
              </Button>
            </div>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Calendar"
        description="What is due, what you already sent, and when interviews landed."
        actions={
          <Button variant="secondary" size="sm" onClick={goToday}>
            Today
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            aria-pressed={filter === item.value}
            className={cn(
              "chip-tone rounded-full px-2.5 py-1 text-xs font-medium",
              filter === item.value
                ? "bg-brand-soft text-brand-on-soft"
                : "bg-surface-muted text-ink-muted hover:text-ink",
            )}
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowDone((value) => !value)}
          aria-pressed={showDone}
          className={cn(
            "chip-tone ml-auto rounded-full px-2.5 py-1 text-xs font-medium",
            showDone
              ? "bg-surface-raised text-ink"
              : "bg-surface-muted text-ink-muted hover:text-ink",
          )}
        >
          {showDone ? "Hide completed" : "Show completed"}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(18rem,1fr)]">
        <Panel>
          <PanelHeader
            title={formatMonthYear(month)}
            description={`${upcoming.length} coming up in two weeks${
              overdue.length ? ` · ${overdue.length} overdue` : ""
            }`}
            action={
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Previous month"
                  onClick={() => setMonth(startOfMonth(addMonths(month, -1)))}
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Next month"
                  onClick={() => setMonth(startOfMonth(addMonths(month, 1)))}
                >
                  <ChevronRight size={16} aria-hidden="true" />
                </Button>
              </div>
            }
          />
          <PanelBody className="pt-3">
            <div className="grid grid-cols-7 gap-1">
              {weekdays.map((label) => (
                <div
                  key={label}
                  className="px-1 pb-1 text-center text-[11px] font-medium uppercase tracking-wide text-ink-subtle"
                >
                  {label}
                </div>
              ))}
              {cells.map((cell) => {
                const dayEvents = eventsOnDay(events, cell.iso, kinds, showDone);
                const isToday = cell.iso === today;
                const isSelected = cell.iso === selected;
                const hasOverdue = dayEvents.some((event) => event.overdue);

                return (
                  <button
                    key={cell.iso}
                    type="button"
                    onClick={() => setSelected(cell.iso)}
                    aria-pressed={isSelected}
                    aria-label={`${formatShortDate(cell.iso)}${
                      dayEvents.length
                        ? `, ${dayEvents.length} item${dayEvents.length === 1 ? "" : "s"}`
                        : ""
                    }`}
                    className={cn(
                      "flex min-h-[4.5rem] flex-col items-start rounded-2xl px-1.5 py-1.5 text-left transition sm:min-h-[5.75rem]",
                      cell.inMonth ? "bg-surface-muted/70" : "opacity-40",
                      isSelected
                        ? "bg-brand-soft ring-2 ring-brand/40"
                        : "hover:bg-surface-raised",
                      hasOverdue && !isSelected ? "ring-1 ring-negative/30" : "",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                        isToday
                          ? "bg-brand text-brand-ink"
                          : isSelected
                            ? "text-brand-on-soft"
                            : "text-ink",
                      )}
                    >
                      {Number(cell.iso.slice(-2))}
                    </span>
                    <ul className="mt-1 hidden w-full space-y-0.5 sm:block">
                      {dayEvents.slice(0, 2).map((event) => (
                        <li
                          key={event.id}
                          className={cn(
                            "truncate rounded-md px-1 py-0.5 text-[10px] leading-3",
                            CALENDAR_KIND_META[event.kind].chip,
                            event.done ? "line-through opacity-60" : "",
                          )}
                        >
                          {event.title}
                        </li>
                      ))}
                      {dayEvents.length > 2 ? (
                        <li className="px-1 text-[10px] text-ink-subtle">
                          +{dayEvents.length - 2} more
                        </li>
                      ) : null}
                    </ul>
                    <div className="mt-auto flex flex-wrap gap-0.5 pt-1 sm:hidden">
                      {dayEvents.slice(0, 4).map((event) => (
                        <span
                          key={event.id}
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            event.overdue
                              ? "bg-negative"
                              : CALENDAR_KIND_META[event.kind].dot,
                          )}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-ink-muted">
              {CALENDAR_KINDS.map((kind) => (
                <span key={kind} className="inline-flex items-center gap-1.5">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      CALENDAR_KIND_META[kind].dot,
                    )}
                  />
                  {CALENDAR_KIND_META[kind].label}
                </span>
              ))}
            </div>
          </PanelBody>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <PanelHeader
              title={
                selected === today
                  ? "Today"
                  : formatShortDate(selected)
              }
              description={
                selectedEvents.length === 0
                  ? "Nothing scheduled."
                  : `${selectedEvents.length} item${selectedEvents.length === 1 ? "" : "s"}`
              }
            />
            <PanelBody className="space-y-3">
              {selectedEvents.length === 0 ? (
                <p className="text-xs text-ink-subtle">
                  Add a reminder for this day, or pick another date.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {selectedEvents.map((event) => (
                    <EventRow
                      key={event.id}
                      event={event}
                      onToggleReminder={toggleReminder}
                      onSnoozeFollowUp={snoozeFollowUp}
                    />
                  ))}
                </ul>
              )}

              <form
                className="space-y-2 border-t border-line pt-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitReminder();
                }}
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">
                  Reminder on {formatShortDate(selected)}
                </p>
                <Select
                  value={applicationId}
                  onChange={(event) => setApplicationId(event.target.value)}
                  aria-label="Application"
                  required
                >
                  <option value="">Choose a role</option>
                  {openApplications.map((application) => (
                    <option key={application.id} value={application.id}>
                      {application.company} — {application.position}
                    </option>
                  ))}
                </Select>
                <div className="flex gap-2">
                  <TextInput
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Prep notes, thank-you, check status"
                    aria-label="Reminder title"
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    disabled={!title.trim() || !applicationId}
                  >
                    <BellPlus size={14} aria-hidden="true" />
                    Add
                  </Button>
                </div>
              </form>
            </PanelBody>
          </Panel>

          {overdue.length > 0 ? (
            <Panel>
              <PanelHeader
                title="Overdue"
                description="Still open and past the date you set."
              />
              <PanelBody>
                <ul className="space-y-1.5">
                  {overdue.map((event) => (
                    <EventRow
                      key={event.id}
                      event={event}
                      showDate
                      onToggleReminder={toggleReminder}
                      onSnoozeFollowUp={snoozeFollowUp}
                    />
                  ))}
                </ul>
              </PanelBody>
            </Panel>
          ) : null}

          <Panel>
            <PanelHeader
              title="Next two weeks"
              description="Reminders, follow-ups, and interviews coming up."
            />
            <PanelBody>
              {upcoming.length === 0 ? (
                <p className="flex items-center gap-1.5 text-xs text-positive">
                  <Clock size={12} aria-hidden="true" />
                  Clear horizon. Nothing is due in the next 14 days.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {upcoming.map((event) => (
                    <EventRow
                      key={event.id}
                      event={event}
                      showDate
                      onToggleReminder={toggleReminder}
                      onSnoozeFollowUp={snoozeFollowUp}
                    />
                  ))}
                </ul>
              )}
            </PanelBody>
          </Panel>
        </div>
      </div>
    </>
  );
}

function EventRow({
  event,
  showDate = false,
  onToggleReminder,
  onSnoozeFollowUp,
}: {
  event: CalendarEvent;
  showDate?: boolean;
  onToggleReminder: (id: string) => void;
  onSnoozeFollowUp: (applicationId: string) => void;
}) {
  return (
    <li className="flex items-start gap-2 rounded-xl bg-surface-muted px-2.5 py-2">
      {event.reminderId ? (
        <button
          type="button"
          onClick={() => onToggleReminder(event.reminderId!)}
          aria-pressed={Boolean(event.done)}
          aria-label={
            event.done
              ? `Mark "${event.title}" as not done`
              : `Mark "${event.title}" as done`
          }
          className={cn(
            "mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full transition",
            event.done ? "bg-positive text-white" : "bg-surface hover:bg-brand-soft",
          )}
        >
          {event.done ? <Check size={11} aria-hidden="true" /> : null}
        </button>
      ) : (
        <span
          className={cn(
            "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
            event.overdue ? "bg-negative" : CALENDAR_KIND_META[event.kind].dot,
          )}
        />
      )}

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-xs font-medium",
            event.done ? "text-ink-subtle line-through" : "text-ink",
          )}
        >
          {event.title}
        </p>
        <p
          className={cn(
            "truncate text-[11px]",
            event.overdue ? "font-medium text-negative" : "text-ink-subtle",
          )}
        >
          {event.subtitle}
          {showDate ? ` · ${formatRelativeDay(event.date)}` : ""}
        </p>
        <span
          className={cn(
            "mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium",
            CALENDAR_KIND_META[event.kind].chip,
          )}
        >
          {CALENDAR_KIND_META[event.kind].label}
        </span>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        {event.kind === "follow-up" ? (
          <button
            type="button"
            onClick={() => onSnoozeFollowUp(event.applicationId)}
            className="text-[11px] font-medium text-ink-muted transition hover:text-ink"
          >
            +7 days
          </button>
        ) : null}
        <Link
          href={`/applications/${event.applicationId}`}
          aria-label={`Open application for ${event.subtitle}`}
          className="rounded p-1 text-ink-subtle transition hover:text-brand"
        >
          <ChevronRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </li>
  );
}
