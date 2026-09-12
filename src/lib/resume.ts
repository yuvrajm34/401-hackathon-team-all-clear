import { createId, nowIso } from "./ids";
import type {
  Bullet,
  EducationItem,
  ExperienceItem,
  ProjectItem,
  Resume,
  ResumeProfile,
  SkillGroup,
} from "./types";

/* -------------------------------------------------------------------------- */
/*                                  Factories                                 */
/* -------------------------------------------------------------------------- */

export function createBullet(text = ""): Bullet {
  return { id: createId("bul"), text, enabled: true };
}

export function createExperience(): ExperienceItem {
  return {
    id: createId("exp"),
    company: "",
    role: "",
    location: "",
    start: "",
    end: "",
    bullets: [createBullet()],
    enabled: true,
  };
}

export function createEducation(): EducationItem {
  return {
    id: createId("edu"),
    school: "",
    degree: "",
    location: "",
    start: "",
    end: "",
    details: "",
    enabled: true,
  };
}

export function createProject(): ProjectItem {
  return {
    id: createId("prj"),
    name: "",
    tech: "",
    link: "",
    start: "",
    end: "",
    bullets: [createBullet()],
    enabled: true,
  };
}

export function createSkillGroup(label = ""): SkillGroup {
  return { id: createId("skl"), label, skills: [], enabled: true };
}

export function emptyProfile(fullName = ""): ResumeProfile {
  return {
    fullName,
    headline: "",
    email: "",
    phone: "",
    location: "",
    links: [
      { id: createId("lnk"), label: "LinkedIn", url: "" },
      { id: createId("lnk"), label: "GitHub", url: "" },
      { id: createId("lnk"), label: "Portfolio", url: "" },
    ],
  };
}

export function createResume(options: {
  name: string;
  isMaster: boolean;
  ownerName?: string;
}): Resume {
  const timestamp = nowIso();
  return {
    id: createId("res"),
    name: options.name,
    isMaster: options.isMaster,
    derivedFromId: null,
    targetApplicationId: null,
    profile: emptyProfile(options.ownerName ?? ""),
    summary: "",
    experience: [createExperience()],
    education: [createEducation()],
    projects: [],
    skills: [createSkillGroup("Languages"), createSkillGroup("Tools")],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/* -------------------------------------------------------------------------- */
/*                                  Tailoring                                 */
/* -------------------------------------------------------------------------- */

/**
 * Clones the master into a tailored copy. Item and bullet IDs are intentionally
 * preserved so `diffAgainstMaster` can line the two up afterwards and offer a
 * per-item "reset to master".
 */
export function tailorFromMaster(
  master: Resume,
  options: { name: string; targetApplicationId: string | null },
): Resume {
  const timestamp = nowIso();
  const clone = structuredCloneSafe(master);

  return {
    ...clone,
    id: createId("res"),
    name: options.name,
    isMaster: false,
    derivedFromId: master.id,
    targetApplicationId: options.targetApplicationId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/** `structuredClone` isn't available everywhere; JSON round-trip is enough here. */
function structuredCloneSafe<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface ResumeDiff {
  /** IDs of experience/project/education/skill entries that differ from master. */
  changedItemIds: Set<string>;
  /** IDs of bullets whose text or enabled flag differs from master. */
  changedBulletIds: Set<string>;
  /** IDs present in the tailored resume but not in the master. */
  addedItemIds: Set<string>;
  summaryChanged: boolean;
  profileChanged: boolean;
  totalChanges: number;
}

export function emptyDiff(): ResumeDiff {
  return {
    changedItemIds: new Set(),
    changedBulletIds: new Set(),
    addedItemIds: new Set(),
    summaryChanged: false,
    profileChanged: false,
    totalChanges: 0,
  };
}

/**
 * Compares a tailored resume with the master it was cloned from so the editor
 * can badge exactly what was customised for this application.
 */
export function diffAgainstMaster(
  tailored: Resume,
  master: Resume | undefined,
): ResumeDiff {
  const diff = emptyDiff();
  if (!master) return diff;

  const masterExperience = indexById(master.experience);
  const masterProjects = indexById(master.projects);
  const masterEducation = indexById(master.education);
  const masterSkills = indexById(master.skills);

  diff.summaryChanged = tailored.summary.trim() !== master.summary.trim();
  diff.profileChanged =
    JSON.stringify(tailored.profile) !== JSON.stringify(master.profile);

  for (const item of tailored.experience) {
    const base = masterExperience.get(item.id);
    if (!base) {
      diff.addedItemIds.add(item.id);
      continue;
    }
    if (
      item.company !== base.company ||
      item.role !== base.role ||
      item.location !== base.location ||
      item.start !== base.start ||
      item.end !== base.end ||
      item.enabled !== base.enabled
    ) {
      diff.changedItemIds.add(item.id);
    }
    collectBulletChanges(item.bullets, base.bullets, diff);
  }

  for (const item of tailored.projects) {
    const base = masterProjects.get(item.id);
    if (!base) {
      diff.addedItemIds.add(item.id);
      continue;
    }
    if (
      item.name !== base.name ||
      item.tech !== base.tech ||
      item.link !== base.link ||
      item.start !== base.start ||
      item.end !== base.end ||
      item.enabled !== base.enabled
    ) {
      diff.changedItemIds.add(item.id);
    }
    collectBulletChanges(item.bullets, base.bullets, diff);
  }

  for (const item of tailored.education) {
    const base = masterEducation.get(item.id);
    if (!base) {
      diff.addedItemIds.add(item.id);
      continue;
    }
    if (JSON.stringify(item) !== JSON.stringify(base)) {
      diff.changedItemIds.add(item.id);
    }
  }

  for (const item of tailored.skills) {
    const base = masterSkills.get(item.id);
    if (!base) {
      diff.addedItemIds.add(item.id);
      continue;
    }
    if (JSON.stringify(item) !== JSON.stringify(base)) {
      diff.changedItemIds.add(item.id);
    }
  }

  diff.totalChanges =
    diff.changedItemIds.size +
    diff.changedBulletIds.size +
    diff.addedItemIds.size +
    (diff.summaryChanged ? 1 : 0) +
    (diff.profileChanged ? 1 : 0);

  return diff;
}

function collectBulletChanges(
  bullets: Bullet[],
  baseBullets: Bullet[],
  diff: ResumeDiff,
) {
  const base = indexById(baseBullets);
  for (const bullet of bullets) {
    const original = base.get(bullet.id);
    if (!original) {
      diff.addedItemIds.add(bullet.id);
      continue;
    }
    if (
      bullet.text.trim() !== original.text.trim() ||
      bullet.enabled !== original.enabled
    ) {
      diff.changedBulletIds.add(bullet.id);
    }
  }
}

function indexById<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

/* -------------------------------------------------------------------------- */
/*                              Derived read models                           */
/* -------------------------------------------------------------------------- */

/** The resume as it will actually be rendered: disabled entries removed. */
export function visibleResume(resume: Resume) {
  return {
    experience: resume.experience
      .filter((item) => item.enabled)
      .map((item) => ({
        ...item,
        bullets: item.bullets.filter((b) => b.enabled && b.text.trim()),
      })),
    projects: resume.projects
      .filter((item) => item.enabled)
      .map((item) => ({
        ...item,
        bullets: item.bullets.filter((b) => b.enabled && b.text.trim()),
      })),
    education: resume.education.filter((item) => item.enabled),
    skills: resume.skills
      .filter((group) => group.enabled && group.skills.length > 0)
      .map((group) => ({ ...group, skills: group.skills.filter(Boolean) })),
  };
}

/** Flat text of everything a reader would actually see. Feeds keyword matching. */
export function resumeText(resume: Resume): string {
  const visible = visibleResume(resume);
  const parts: string[] = [
    resume.profile.headline,
    resume.summary,
    ...visible.experience.flatMap((item) => [
      item.role,
      item.company,
      ...item.bullets.map((b) => b.text),
    ]),
    ...visible.projects.flatMap((item) => [
      item.name,
      item.tech,
      ...item.bullets.map((b) => b.text),
    ]),
    ...visible.education.flatMap((item) => [
      item.school,
      item.degree,
      item.details,
    ]),
    ...visible.skills.flatMap((group) => [group.label, ...group.skills]),
  ];

  return parts.filter(Boolean).join("\n");
}

/** Rough one-page check: resumes much past this tend to spill onto page two. */
export function estimateLineCount(resume: Resume): number {
  const visible = visibleResume(resume);
  const summaryLines = resume.summary ? Math.ceil(resume.summary.length / 110) : 0;
  const bulletLines =
    visible.experience.reduce(
      (total, item) =>
        total +
        2 +
        item.bullets.reduce((n, b) => n + Math.ceil(b.text.length / 105), 0),
      0,
    ) +
    visible.projects.reduce(
      (total, item) =>
        total +
        2 +
        item.bullets.reduce((n, b) => n + Math.ceil(b.text.length / 105), 0),
      0,
    );

  return (
    6 + summaryLines + bulletLines + visible.education.length * 2 + visible.skills.length
  );
}

export function dateRangeLabel(start: string, end: string): string {
  if (start && end) return `${start} – ${end}`;
  return start || end || "";
}
