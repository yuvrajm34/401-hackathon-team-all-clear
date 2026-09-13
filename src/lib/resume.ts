import { createId, nowIso } from "./ids";
import {
  classifyLink,
  defaultLabelForKind,
  type ParsedResume,
} from "./resume-parse";
import {
  RESUME_SECTIONS,
  type Bullet,
  type EducationItem,
  type ExperienceItem,
  type ProjectItem,
  type Resume,
  type ResumeProfile,
  type ResumeSectionKey,
  type SkillGroup,
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
    sectionOrder: [...RESUME_SECTIONS],
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

/**
 * The section order to render/print in. Falls back to the default order
 * for resumes saved before `sectionOrder` existed, and drops/repairs any
 * stale or missing keys so a future schema change can't produce a broken
 * order for old data.
 */
export function getSectionOrder(resume: Resume): ResumeSectionKey[] {
  const known = new Set<ResumeSectionKey>(RESUME_SECTIONS);
  const saved = (resume.sectionOrder ?? []).filter((key) => known.has(key));
  const missing = RESUME_SECTIONS.filter((key) => !saved.includes(key));
  return [...saved, ...missing];
}

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

/**
 * Writes a parsed upload onto an existing resume.
 *
 * Profile fields that the file actually has win. Labeled links (LinkedIn,
 * GitHub, Portfolio) land on the matching row instead of stacking duplicates.
 *
 * If the file has any body sections, this is a full import: every structured
 * section is replaced from the parse. Empty parsed sections are cleared so
 * leftover sample roles / projects do not stay after a real resume upload.
 * A contact-only file (name, email, phone, links) leaves existing sections.
 */
export function applyParsedToResume(
  resume: Resume,
  parsed: ParsedResume,
): string[] {
  const applied: string[] = [];
  const { profile } = resume;

  const setIf = (
    key: keyof Omit<ResumeProfile, "links">,
    value: string,
    label: string,
  ) => {
    const next = value.trim();
    if (!next) return;
    profile[key] = next;
    applied.push(label);
  };

  setIf("fullName", parsed.profile.fullName, "name");
  setIf("headline", parsed.profile.headline, "headline");
  setIf("email", parsed.profile.email, "email");
  setIf("phone", parsed.profile.phone, "phone");
  setIf("location", parsed.profile.location, "location");

  const fullImport = parsedHasBody(parsed);

  if (fullImport && !parsed.profile.headline.trim()) {
    profile.headline = "";
  }

  if (!profile.location.trim()) {
    const fromSchool = parsed.education.find((item) => item.location.trim());
    if (fromSchool) {
      profile.location = fromSchool.location.trim();
      applied.push("location");
    }
  }

  for (const incoming of parsed.profile.links) {
    if (!incoming.url.trim()) continue;
    const kind = classifyLink(incoming.label, incoming.url);
    const label = incoming.label.trim() || defaultLabelForKind(kind);

    const match = profile.links.find((link) => {
      const existingKind = classifyLink(link.label, link.url);
      if (kind !== "other" && existingKind === kind) return true;
      return link.label.trim().toLowerCase() === label.toLowerCase();
    });

    if (match) {
      match.url = incoming.url.trim();
      if (!match.label.trim() || match.label === "Link") match.label = label;
    } else {
      profile.links.push({
        id: createId("lnk"),
        label,
        url: incoming.url.trim(),
      });
    }
    applied.push(label);
  }

  if (fullImport) {
    const incomingKinds = new Set(
      parsed.profile.links
        .filter((link) => link.url.trim())
        .map((link) => classifyLink(link.label, link.url)),
    );
    for (const link of profile.links) {
      const kind = classifyLink(link.label, link.url);
      if (kind !== "other" && !incomingKinds.has(kind)) {
        link.url = "";
      }
    }
  }

  if (fullImport || parsed.summary.trim()) {
    resume.summary = parsed.summary.trim();
    if (parsed.summary.trim()) applied.push("summary");
  }

  if (fullImport || parsed.experience.length > 0) {
    resume.experience = parsed.experience.map((item) => ({
      id: createId("exp"),
      company: item.company,
      role: item.role,
      location: item.location,
      start: item.start,
      end: item.end,
      bullets:
        item.bullets.length > 0
          ? item.bullets.map((text) => createBullet(flattenPlain(text)))
          : [createBullet()],
      enabled: true,
    }));
    if (parsed.experience.length > 0) applied.push("experience");
  }

  if (fullImport || parsed.education.length > 0) {
    resume.education = parsed.education.map((item) => ({
      id: createId("edu"),
      school: item.school,
      degree: item.degree,
      location: item.location,
      start: item.start,
      end: item.end,
      details: item.details,
      enabled: true,
    }));
    if (parsed.education.length > 0) applied.push("education");
  }

  if (fullImport || parsed.projects.length > 0) {
    resume.projects = parsed.projects.map((item) => ({
      id: createId("prj"),
      name: item.name,
      tech: item.tech,
      link: item.link,
      start: item.start,
      end: item.end,
      bullets:
        item.bullets.length > 0
          ? item.bullets.map((text) => createBullet(flattenPlain(text)))
          : [createBullet()],
      enabled: true,
    }));
    if (parsed.projects.length > 0) applied.push("projects");
  }

  if (fullImport || parsed.skills.length > 0) {
    resume.skills = parsed.skills.map((group) => ({
      id: createId("skl"),
      label: group.label,
      skills: group.skills,
      enabled: true,
    }));
    if (parsed.skills.length > 0) applied.push("skills");
  }

  return unique(applied);
}

function parsedHasBody(parsed: ParsedResume): boolean {
  return (
    Boolean(parsed.summary.trim()) ||
    parsed.experience.length > 0 ||
    parsed.education.length > 0 ||
    parsed.projects.length > 0 ||
    parsed.skills.length > 0
  );
}

function flattenPlain(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
