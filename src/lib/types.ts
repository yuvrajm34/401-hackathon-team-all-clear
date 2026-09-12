/**
 * Domain model for ApplyPath.
 *
 * Everything is persisted in the browser (localStorage) via the Zustand store,
 * so these types double as the on-disk schema. Bump SCHEMA_VERSION and add a
 * migration in `src/store/useAppStore.ts` when changing anything here.
 */

export const SCHEMA_VERSION = 1;

/* -------------------------------------------------------------------------- */
/*                                Applications                                */
/* -------------------------------------------------------------------------- */

export const STAGES = [
  "wishlist",
  "applied",
  "interview",
  "offer",
  "rejected",
] as const;

export type Stage = (typeof STAGES)[number];

export type WorkMode = "onsite" | "hybrid" | "remote" | "unknown";

export interface Application {
  id: string;
  company: string;
  position: string;
  location: string;
  workMode: WorkMode;
  /** Link to the posting. */
  url: string;
  /** Free-form, e.g. "$95k - $110k". */
  salary: string;
  stage: Stage;
  /** ISO date (yyyy-mm-dd). Empty while an application is still a wishlist item. */
  dateApplied: string;
  /** ISO date (yyyy-mm-dd) for the next planned follow-up. */
  followUpDate: string;
  jobDescription: string;
  notes: string;
  tags: string[];
  /** Resume used for this application, if any. */
  resumeId: string | null;
  /** 1 (low) - 3 (high). Drives sort order and the priority dot. */
  priority: 1 | 2 | 3;
  createdAt: string;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/*                               Communications                              */
/* -------------------------------------------------------------------------- */

export const COMMUNICATION_CHANNELS = [
  "email",
  "phone",
  "interview",
  "recruiter",
  "portal",
  "other",
] as const;

export type CommunicationChannel = (typeof COMMUNICATION_CHANNELS)[number];

export type CommunicationDirection = "inbound" | "outbound";

/**
 * Outcomes that can move an application forward. `none` means the message was
 * logged for the record without changing where the application stands.
 */
export const COMMUNICATION_OUTCOMES = [
  "none",
  "interview_invite",
  "offer",
  "rejection",
  "info_request",
] as const;

export type CommunicationOutcome = (typeof COMMUNICATION_OUTCOMES)[number];

export interface Communication {
  id: string;
  applicationId: string;
  /** ISO date (yyyy-mm-dd). */
  date: string;
  channel: CommunicationChannel;
  direction: CommunicationDirection;
  subject: string;
  body: string;
  outcome: CommunicationOutcome;
  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/*                                  Reminders                                 */
/* -------------------------------------------------------------------------- */

export interface Reminder {
  id: string;
  /** Reminders always belong to an application. */
  applicationId: string;
  title: string;
  /** ISO date (yyyy-mm-dd). */
  dueDate: string;
  done: boolean;
  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/*                                   Resumes                                  */
/* -------------------------------------------------------------------------- */

export interface ProfileLink {
  id: string;
  label: string;
  url: string;
}

export interface ResumeProfile {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  links: ProfileLink[];
}

/** A single achievement line. Disabled bullets stay stored but are not rendered. */
export interface Bullet {
  id: string;
  text: string;
  enabled: boolean;
}

export interface ExperienceItem {
  id: string;
  company: string;
  role: string;
  location: string;
  start: string;
  end: string;
  bullets: Bullet[];
  enabled: boolean;
}

export interface EducationItem {
  id: string;
  school: string;
  degree: string;
  location: string;
  start: string;
  end: string;
  details: string;
  enabled: boolean;
}

export interface ProjectItem {
  id: string;
  name: string;
  tech: string;
  link: string;
  start: string;
  end: string;
  bullets: Bullet[];
  enabled: boolean;
}

export interface SkillGroup {
  id: string;
  label: string;
  skills: string[];
  enabled: boolean;
}

export interface Resume {
  id: string;
  name: string;
  /** Exactly one resume is the master; tailored copies are cloned from it. */
  isMaster: boolean;
  /** Master resume this was tailored from (tailored resumes only). */
  derivedFromId: string | null;
  /** Application this resume was tailored for (tailored resumes only). */
  targetApplicationId: string | null;
  profile: ResumeProfile;
  summary: string;
  experience: ExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
  skills: SkillGroup[];
  createdAt: string;
  updatedAt: string;
}

/** Section keys that can be reordered / toggled in the editor. */
export const RESUME_SECTIONS = [
  "summary",
  "experience",
  "projects",
  "education",
  "skills",
] as const;

export type ResumeSectionKey = (typeof RESUME_SECTIONS)[number];

/* -------------------------------------------------------------------------- */
/*                                  Settings                                  */
/* -------------------------------------------------------------------------- */

export type ThemePreference = "light" | "dark" | "system";

export interface Settings {
  /** Applications the user aims to send per week. */
  weeklyGoal: number;
  /** Days without a reply before an application is flagged as needing a nudge. */
  followUpAfterDays: number;
  theme: ThemePreference;
  ownerName: string;
}

/* -------------------------------------------------------------------------- */
/*                              Portable snapshot                             */
/* -------------------------------------------------------------------------- */

export interface AppSnapshot {
  schemaVersion: number;
  exportedAt: string;
  applications: Application[];
  communications: Communication[];
  reminders: Reminder[];
  resumes: Resume[];
  settings: Settings;
}
