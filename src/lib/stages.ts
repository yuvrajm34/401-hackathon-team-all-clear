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
    badge: "bg-accent-soft text-accent-on-soft",
    accent: "text-accent",
    rail: "bg-accent-soft",
    bar: "bg-accent",
    dot: "bg-accent",
  },
  applied: {
    id: "applied",
    label: "Applied",
    hint: "Sent, waiting to hear back",
    badge: "bg-brand-soft text-brand-on-soft",
    accent: "text-brand",
    rail: "bg-brand-soft",
    bar: "bg-brand",
    dot: "bg-brand",
  },
  interview: {
    id: "interview",
    label: "Interview",
    hint: "Conversations in progress",
    badge: "bg-brand-soft text-brand-on-soft",
    accent: "text-brand",
    rail: "bg-brand-soft",
    bar: "bg-brand",
    dot: "bg-brand",
  },
  offer: {
    id: "offer",
    label: "Offer",
    hint: "The good stuff lands here",
    badge: "bg-positive-soft text-positive",
    accent: "text-positive",
    rail: "bg-positive-soft",
    bar: "bg-positive",
    dot: "bg-positive",
  },
  rejected: {
    id: "rejected",
    label: "Closed",
    hint: "Rejected or withdrawn",
    badge: "bg-surface-muted text-ink-muted",
    accent: "text-ink-muted",
    rail: "bg-surface-muted",
    bar: "bg-ink-subtle",
    dot: "bg-ink-subtle",
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
