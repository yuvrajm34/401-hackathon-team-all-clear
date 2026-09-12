import type { CommunicationOutcome, Stage } from "./types";
import { STAGES } from "./types";

export interface StageMeta {
  id: Stage;
  label: string;
  /** One-liner shown on empty Kanban columns. */
  hint: string;
  /** Solid chip used for badges. */
  badge: string;
  /** Column header accent. */
  accent: string;
  /** Left border on cards. */
  rail: string;
  /** Progress / funnel bar fill. */
  bar: string;
  dot: string;
}

export const STAGE_META: Record<Stage, StageMeta> = {
  wishlist: {
    id: "wishlist",
    label: "Wishlist",
    hint: "Roles you want to apply to",
    badge:
      "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700",
    accent: "text-slate-600 dark:text-slate-300",
    rail: "border-l-slate-300 dark:border-l-slate-600",
    bar: "bg-slate-400",
    dot: "bg-slate-400",
  },
  applied: {
    id: "applied",
    label: "Applied",
    hint: "Sent, waiting to hear back",
    badge:
      "bg-sky-100 text-sky-800 ring-sky-200 dark:bg-sky-950 dark:text-sky-200 dark:ring-sky-800",
    accent: "text-sky-600 dark:text-sky-300",
    rail: "border-l-sky-400 dark:border-l-sky-500",
    bar: "bg-sky-500",
    dot: "bg-sky-500",
  },
  interview: {
    id: "interview",
    label: "Interview",
    hint: "Conversations in progress",
    badge:
      "bg-amber-100 text-amber-900 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-800",
    accent: "text-amber-600 dark:text-amber-300",
    rail: "border-l-amber-400 dark:border-l-amber-500",
    bar: "bg-amber-500",
    dot: "bg-amber-500",
  },
  offer: {
    id: "offer",
    label: "Offer",
    hint: "The good stuff lands here",
    badge:
      "bg-emerald-100 text-emerald-900 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-800",
    accent: "text-emerald-600 dark:text-emerald-300",
    rail: "border-l-emerald-400 dark:border-l-emerald-500",
    bar: "bg-emerald-500",
    dot: "bg-emerald-500",
  },
  rejected: {
    id: "rejected",
    label: "Closed",
    hint: "Rejected or withdrawn",
    badge:
      "bg-rose-100 text-rose-900 ring-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:ring-rose-800",
    accent: "text-rose-600 dark:text-rose-300",
    rail: "border-l-rose-400 dark:border-l-rose-500",
    bar: "bg-rose-500",
    dot: "bg-rose-500",
  },
};

export const STAGE_ORDER: Stage[] = [...STAGES];

/** Stages that mean "the user has actually submitted something". */
export const ACTIVE_STAGES: Stage[] = ["applied", "interview", "offer"];

export function stageIndex(stage: Stage): number {
  return STAGE_ORDER.indexOf(stage);
}

export function isStage(value: unknown): value is Stage {
  return typeof value === "string" && STAGE_ORDER.includes(value as Stage);
}

/**
 * Stage a logged reply implies. Returning `null` means "leave the stage alone",
 * which is what we do for informational messages.
 */
export function stageForOutcome(outcome: CommunicationOutcome): Stage | null {
  switch (outcome) {
    case "interview_invite":
      return "interview";
    case "offer":
      return "offer";
    case "rejection":
      return "rejected";
    default:
      return null;
  }
}

export const OUTCOME_LABELS: Record<CommunicationOutcome, string> = {
  none: "No status change",
  interview_invite: "Interview invitation",
  offer: "Offer",
  rejection: "Rejection",
  info_request: "Asked for more info",
};

export const CHANNEL_LABELS = {
  email: "Email",
  phone: "Phone call",
  interview: "Interview",
  recruiter: "Recruiter message",
  portal: "Application portal",
  other: "Other",
} as const;

export const WORK_MODE_LABELS = {
  onsite: "On-site",
  hybrid: "Hybrid",
  remote: "Remote",
  unknown: "Not specified",
} as const;

export const PRIORITY_LABELS: Record<1 | 2 | 3, string> = {
  1: "Low",
  2: "Medium",
  3: "High",
};
