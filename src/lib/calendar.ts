import { addDays, todayIso } from "./dates";
import { CHANNEL_LABELS } from "./stages";
import type { Application, Communication, Reminder } from "./types";

export const CALENDAR_KINDS = [
  "reminder",
  "follow-up",
  "interview",
  "applied",
] as const;

export type CalendarKind = (typeof CALENDAR_KINDS)[number];

export interface CalendarEvent {
  id: string;
  date: string;
  kind: CalendarKind;
  title: string;
  subtitle: string;
  applicationId: string;
  reminderId?: string;
  done?: boolean;
  overdue?: boolean;
}

export const CALENDAR_KIND_META: Record<
  CalendarKind,
  { label: string; dot: string; chip: string }
> = {
  reminder: {
    label: "Reminder",
    dot: "bg-accent",
    chip: "bg-accent-soft text-accent-on-soft",
  },
  "follow-up": {
    label: "Follow-up",
    dot: "bg-brand",
    chip: "bg-brand-soft text-brand-on-soft",
  },
  interview: {
    label: "Interview",
    dot: "bg-positive",
    chip: "bg-positive-soft text-positive",
  },
  applied: {
    label: "Applied",
    dot: "bg-ink-subtle",
    chip: "bg-surface-muted text-ink-muted",
  },
};

const KIND_ORDER: Record<CalendarKind, number> = {
  reminder: 0,
  "follow-up": 1,
  interview: 2,
  applied: 3,
};

function companyLabel(application: Application | undefined): string {
  return application?.company ?? "Unknown company";
}

/**
 * Everything that belongs on a job-search calendar, derived from store data.
 * Reminders and planned follow-ups are the actionable items; interviews and
 * applied dates are the record of what already happened.
 */
export function collectCalendarEvents(
  applications: Application[],
  communications: Communication[],
  reminders: Reminder[],
): CalendarEvent[] {
  const today = todayIso();
  const byId = new Map(applications.map((application) => [application.id, application]));
  const events: CalendarEvent[] = [];

  for (const reminder of reminders) {
    if (!reminder.dueDate) continue;
    const application = byId.get(reminder.applicationId);
    events.push({
      id: `rem-${reminder.id}`,
      date: reminder.dueDate,
      kind: "reminder",
      title: reminder.title,
      subtitle: companyLabel(application),
      applicationId: reminder.applicationId,
      reminderId: reminder.id,
      done: reminder.done,
      overdue: !reminder.done && reminder.dueDate < today,
    });
  }

  for (const application of applications) {
    if (application.followUpDate) {
      events.push({
        id: `follow-${application.id}`,
        date: application.followUpDate,
        kind: "follow-up",
        title: `Follow up with ${application.company}`,
        subtitle: application.position,
        applicationId: application.id,
        overdue: application.followUpDate < today,
      });
    }

    if (application.dateApplied) {
      events.push({
        id: `applied-${application.id}`,
        date: application.dateApplied,
        kind: "applied",
        title: `Applied to ${application.company}`,
        subtitle: application.position,
        applicationId: application.id,
      });
    }
  }

  for (const message of communications) {
    const isInterview =
      message.channel === "interview" || message.outcome === "interview_invite";
    if (!isInterview || !message.date) continue;

    const application = byId.get(message.applicationId);
    const label =
      message.channel === "interview"
        ? message.subject || "Interview"
        : message.subject || CHANNEL_LABELS.interview;

    events.push({
      id: `int-${message.id}`,
      date: message.date,
      kind: "interview",
      title: label,
      subtitle: companyLabel(application),
      applicationId: message.applicationId,
    });
  }

  return events.sort(compareCalendarEvents);
}

function compareCalendarEvents(a: CalendarEvent, b: CalendarEvent): number {
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  if (Boolean(a.overdue) !== Boolean(b.overdue)) return a.overdue ? -1 : 1;
  if (Boolean(a.done) !== Boolean(b.done)) return a.done ? 1 : -1;
  return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
}

export function eventsOnDay(
  events: CalendarEvent[],
  date: string,
  kinds: ReadonlySet<CalendarKind>,
  includeDone: boolean,
): CalendarEvent[] {
  return events.filter(
    (event) =>
      event.date === date &&
      kinds.has(event.kind) &&
      (includeDone || !event.done),
  );
}

export function eventsInRange(
  events: CalendarEvent[],
  from: string,
  to: string,
  kinds: ReadonlySet<CalendarKind>,
  includeDone: boolean,
): CalendarEvent[] {
  return events.filter(
    (event) =>
      event.date >= from &&
      event.date <= to &&
      kinds.has(event.kind) &&
      (includeDone || !event.done),
  );
}

export function overdueEvents(
  events: CalendarEvent[],
  kinds: ReadonlySet<CalendarKind>,
): CalendarEvent[] {
  const today = todayIso();
  return events.filter(
    (event) =>
      event.overdue &&
      event.date < today &&
      !event.done &&
      kinds.has(event.kind),
  );
}

export function upcomingHorizon(days = 14): { from: string; to: string } {
  const from = todayIso();
  return { from, to: addDays(from, days) };
}
