import {
  addDays,
  daysSince,
  startOfWeek,
  toIsoDate,
  todayIso,
} from "./dates";
import { STAGE_ORDER, stageIndex } from "./stages";
import type { Application, Communication, Reminder, Stage } from "./types";

export interface FunnelStep {
  stage: Stage;
  label: string;
  /** Applications that reached this stage at any point. */
  count: number;
  /** Percentage of submitted applications that reached this stage. */
  rate: number;
}

export interface PipelineStats {
  /** Current headcount per column. */
  byStage: Record<Stage, number>;
  total: number;
  /** Everything past the wishlist. */
  submitted: number;
  /** Submitted applications with at least one inbound message. */
  responded: number;
  reachedInterview: number;
  reachedOffer: number;
  responseRate: number;
  interviewRate: number;
  offerRate: number;
  funnel: FunnelStep[];
}

const FUNNEL_LABELS: Record<Stage, string> = {
  wishlist: "Saved",
  applied: "Applied",
  interview: "Interviewed",
  offer: "Offers",
  rejected: "Rejected",
};

/**
 * "Reached" is intentionally sticky: a rejection after an onsite still counts
 * as having reached the interview stage, otherwise the funnel would quietly
 * erase every conversation that didn't end in an offer.
 */
function reachedStage(
  application: Application,
  communications: Communication[],
  stage: Stage,
): boolean {
  if (stageIndex(application.stage) >= stageIndex(stage) &&
      application.stage !== "rejected") {
    return true;
  }

  const logs = communications.filter((c) => c.applicationId === application.id);
  if (stage === "interview") {
    return logs.some(
      (c) => c.outcome === "interview_invite" || c.outcome === "offer" || c.channel === "interview",
    );
  }
  if (stage === "offer") {
    return logs.some((c) => c.outcome === "offer");
  }
  if (stage === "applied") {
    return Boolean(application.dateApplied);
  }
  return false;
}

export function computePipelineStats(
  applications: Application[],
  communications: Communication[],
): PipelineStats {
  const byStage = STAGE_ORDER.reduce(
    (acc, stage) => ({ ...acc, [stage]: 0 }),
    {} as Record<Stage, number>,
  );

  for (const application of applications) {
    byStage[application.stage] += 1;
  }

  const submittedApps = applications.filter((a) => a.stage !== "wishlist");
  const submitted = submittedApps.length;

  const responded = submittedApps.filter((application) =>
    communications.some(
      (c) => c.applicationId === application.id && c.direction === "inbound",
    ),
  ).length;

  const reachedInterview = submittedApps.filter((a) =>
    reachedStage(a, communications, "interview"),
  ).length;

  const reachedOffer = submittedApps.filter((a) =>
    reachedStage(a, communications, "offer"),
  ).length;

  const rate = (value: number) =>
    submitted === 0 ? 0 : Math.round((value / submitted) * 100);

  const funnel: FunnelStep[] = [
    {
      stage: "applied",
      label: FUNNEL_LABELS.applied,
      count: submitted,
      rate: submitted === 0 ? 0 : 100,
    },
    {
      stage: "interview",
      label: FUNNEL_LABELS.interview,
      count: reachedInterview,
      rate: rate(reachedInterview),
    },
    {
      stage: "offer",
      label: FUNNEL_LABELS.offer,
      count: reachedOffer,
      rate: rate(reachedOffer),
    },
  ];

  return {
    byStage,
    total: applications.length,
    submitted,
    responded,
    reachedInterview,
    reachedOffer,
    responseRate: rate(responded),
    interviewRate: rate(reachedInterview),
    offerRate: rate(reachedOffer),
    funnel,
  };
}

/* -------------------------------------------------------------------------- */
/*                             Momentum and streaks                           */
/* -------------------------------------------------------------------------- */

export interface WeekBucket {
  /** Monday of the week, ISO date. */
  weekStart: string;
  label: string;
  count: number;
}

export interface MomentumStats {
  thisWeek: number;
  weeklyGoal: number;
  goalProgress: number;
  /** Consecutive days with at least one application or logged message. */
  streakDays: number;
  weeks: WeekBucket[];
  bestWeek: number;
}

export function computeMomentum(
  applications: Application[],
  communications: Communication[],
  weeklyGoal: number,
  weeksToShow = 8,
): MomentumStats {
  const weekStartDate = startOfWeek();
  const weeks: WeekBucket[] = [];

  for (let i = weeksToShow - 1; i >= 0; i -= 1) {
    const start = new Date(weekStartDate);
    start.setDate(start.getDate() - i * 7);
    const startIso = toIsoDate(start);
    const endIso = addDays(startIso, 6);

    const count = applications.filter(
      (a) => a.dateApplied && a.dateApplied >= startIso && a.dateApplied <= endIso,
    ).length;

    weeks.push({
      weekStart: startIso,
      label: start.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      count,
    });
  }

  const thisWeek = weeks[weeks.length - 1]?.count ?? 0;
  const activityDays = new Set<string>();
  for (const application of applications) {
    if (application.dateApplied) activityDays.add(application.dateApplied);
  }
  for (const message of communications) {
    if (message.date) activityDays.add(message.date);
  }

  return {
    thisWeek,
    weeklyGoal,
    goalProgress:
      weeklyGoal <= 0 ? 0 : Math.min(100, Math.round((thisWeek / weeklyGoal) * 100)),
    streakDays: computeStreak(activityDays),
    weeks,
    bestWeek: weeks.reduce((max, week) => Math.max(max, week.count), 0),
  };
}

/**
 * Counts back day by day from today. A quiet today does not break the streak —
 * the day isn't over yet — but a quiet yesterday does.
 */
function computeStreak(activityDays: Set<string>): number {
  const today = todayIso();
  let cursor = activityDays.has(today) ? today : addDays(today, -1);
  let streak = 0;

  while (activityDays.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

/* -------------------------------------------------------------------------- */
/*                          Follow-ups and nudge logic                        */
/* -------------------------------------------------------------------------- */

export interface NudgeItem {
  application: Application;
  /** Days since the application was sent. */
  waitingDays: number;
  reason: "no-response" | "follow-up-due";
}

/**
 * Applications that have gone quiet: sent at least `followUpAfterDays` ago with
 * no inbound reply, or with a follow-up date that has come due.
 */
export function findNudges(
  applications: Application[],
  communications: Communication[],
  followUpAfterDays: number,
): NudgeItem[] {
  const today = todayIso();
  const items: NudgeItem[] = [];

  for (const application of applications) {
    if (application.stage !== "applied" && application.stage !== "interview") {
      continue;
    }

    const hasReply = communications.some(
      (c) => c.applicationId === application.id && c.direction === "inbound",
    );
    const waitingDays = application.dateApplied
      ? daysSince(application.dateApplied)
      : 0;

    if (application.followUpDate && application.followUpDate <= today) {
      items.push({ application, waitingDays, reason: "follow-up-due" });
      continue;
    }

    if (
      !hasReply &&
      application.dateApplied &&
      waitingDays >= followUpAfterDays
    ) {
      items.push({ application, waitingDays, reason: "no-response" });
    }
  }

  return items.sort((a, b) => b.waitingDays - a.waitingDays);
}

export interface UpcomingReminder {
  reminder: Reminder;
  application: Application | undefined;
  overdue: boolean;
}

export function findUpcomingReminders(
  reminders: Reminder[],
  applications: Application[],
  limit = 6,
): UpcomingReminder[] {
  const today = todayIso();

  return reminders
    .filter((reminder) => !reminder.done)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, limit)
    .map((reminder) => ({
      reminder,
      application: applications.find((a) => a.id === reminder.applicationId),
      overdue: Boolean(reminder.dueDate) && reminder.dueDate < today,
    }));
}

/* -------------------------------------------------------------------------- */
/*                                Activity feed                               */
/* -------------------------------------------------------------------------- */

export interface ActivityEntry {
  id: string;
  date: string;
  kind: "application" | "communication";
  title: string;
  detail: string;
  applicationId: string;
  stage: Stage;
}

export function buildActivityFeed(
  applications: Application[],
  communications: Communication[],
  limit = 8,
): ActivityEntry[] {
  const entries: ActivityEntry[] = [];

  for (const application of applications) {
    if (!application.dateApplied) continue;
    entries.push({
      id: `app-${application.id}`,
      date: application.dateApplied,
      kind: "application",
      title: `Applied to ${application.company}`,
      detail: application.position,
      applicationId: application.id,
      stage: application.stage,
    });
  }

  for (const message of communications) {
    const application = applications.find((a) => a.id === message.applicationId);
    if (!application) continue;
    entries.push({
      id: `com-${message.id}`,
      date: message.date,
      kind: "communication",
      title:
        message.direction === "inbound"
          ? `${application.company} replied`
          : `You contacted ${application.company}`,
      detail: message.subject || application.position,
      applicationId: application.id,
      stage: application.stage,
    });
  }

  return entries
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

/* -------------------------------------------------------------------------- */
/*                          Resume effectiveness report                       */
/* -------------------------------------------------------------------------- */

export interface ResumePerformance {
  resumeId: string;
  used: number;
  interviews: number;
  offers: number;
  interviewRate: number;
}

/** Which resume version is actually getting callbacks. */
export function computeResumePerformance(
  applications: Application[],
  communications: Communication[],
): ResumePerformance[] {
  const grouped = new Map<string, Application[]>();

  for (const application of applications) {
    if (!application.resumeId || application.stage === "wishlist") continue;
    const list = grouped.get(application.resumeId) ?? [];
    list.push(application);
    grouped.set(application.resumeId, list);
  }

  return [...grouped.entries()]
    .map(([resumeId, apps]) => {
      const interviews = apps.filter((a) =>
        reachedStage(a, communications, "interview"),
      ).length;
      const offers = apps.filter((a) =>
        reachedStage(a, communications, "offer"),
      ).length;

      return {
        resumeId,
        used: apps.length,
        interviews,
        offers,
        interviewRate:
          apps.length === 0 ? 0 : Math.round((interviews / apps.length) * 100),
      };
    })
    .sort((a, b) => b.interviewRate - a.interviewRate || b.used - a.used);
}
