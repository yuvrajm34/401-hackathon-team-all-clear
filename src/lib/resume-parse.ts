/**
 * Heuristic resume import. Turns the text of a PDF / Word / plain-text file
 * into the structured fields the editor already knows, so uploading a master
 * resume can fill name, contact, and labeled links (LinkedIn, GitHub, …)
 * without a model.
 *
 * Tuned first for ApplyPath's own plain-text export, then for the layouts
 * most student resumes actually use.
 */

export interface ParsedLink {
  label: string;
  url: string;
}

export type ParsedLinkKind =
  | "linkedin"
  | "github"
  | "gitlab"
  | "portfolio"
  | "other";

export interface ParsedExperience {
  company: string;
  role: string;
  location: string;
  start: string;
  end: string;
  bullets: string[];
}

export interface ParsedEducation {
  school: string;
  degree: string;
  location: string;
  start: string;
  end: string;
  details: string;
}

export interface ParsedProject {
  name: string;
  tech: string;
  link: string;
  start: string;
  end: string;
  bullets: string[];
}

export interface ParsedSkillGroup {
  label: string;
  skills: string[];
}

export interface ParsedResume {
  profile: {
    fullName: string;
    headline: string;
    email: string;
    phone: string;
    location: string;
    links: ParsedLink[];
  };
  summary: string;
  experience: ParsedExperience[];
  education: ParsedEducation[];
  projects: ParsedProject[];
  skills: ParsedSkillGroup[];
}

export interface ParseHint {
  /** Extra labeled links pulled from hyperlink annotations (PDF/DOCX). */
  links?: ParsedLink[];
}

const SECTION_ALIASES: Record<string, SectionKey> = {
  summary: "summary",
  "professional summary": "summary",
  profile: "summary",
  about: "summary",
  "about me": "summary",
  objective: "summary",
  "career objective": "summary",
  experience: "experience",
  "work experience": "experience",
  "work history": "experience",
  employment: "experience",
  "professional experience": "experience",
  education: "education",
  academic: "education",
  academics: "education",
  projects: "projects",
  "personal projects": "projects",
  "selected projects": "projects",
  "side projects": "projects",
  skills: "skills",
  "technical skills": "skills",
  "tech stack": "skills",
  technologies: "skills",
  "technical skill": "skills",
};

type SectionKey =
  | "summary"
  | "experience"
  | "education"
  | "projects"
  | "skills";

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE =
  /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}(?:\s*(?:x|ext\.?)\s*\d+)?/;
const URL_RE =
  /(?:https?:\/\/)?(?:www\.)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s|,;)]*)?/i;
const BARE_URL_RE = new RegExp(URL_RE.source, "gi");
const REAL_TLDS =
  /^(com|org|net|io|dev|me|ca|uk|ai|app|co|edu|us|info|gov|mil|xyz)$/i;
const FAKE_TLDS = /^(js|ts|tsx|jsx|py|css|html|json|md|yml|yaml|c|h|java|rb|go)$/i;

const LOCATION_RE =
  /\b([A-Z][A-Za-z .'-]+,\s*(?:[A-Z]{2}|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?))(?:\s*\([^)]+\))?\b/;
const TRAILING_CITY_RE =
  /([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+)*),\s*([A-Z]{2})\s*$/;

const DATE_TOKEN =
  "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|[0-3]?\\d)(?:[./\\s-]\\d{2,4})?|\\d{4}";
const DATE_RANGE_RE = new RegExp(
  `^(${DATE_TOKEN})\\s*[–—\\-–to]+\\s*(${DATE_TOKEN}|Present|Current|Now|Ongoing)$`,
  "i",
);
const TRAILING_DATE_RE = new RegExp(
  `\\s+(?:(Expected\\s+.+)|(?:(${DATE_TOKEN})\\s*[–—\\-]+\\s*(${DATE_TOKEN}|Present|Current|Now|Ongoing)))$`,
  "i",
);

const BULLET_RE = /^(?:[-*•·‒–—]|\d+[.)])\s+/;

/**
 * Classifies a link by the words around it ("LinkedIn") or by the host
 * (linkedin.com). The editor's default rows use these same labels.
 */
export function classifyLink(label: string, url = ""): ParsedLinkKind {
  const hay = `${label} ${url}`.toLowerCase();
  if (/linked\s*in/.test(hay) || /linkedin\.com/.test(hay)) return "linkedin";
  if (/github/.test(hay) || /github\.com/.test(hay)) {
    const parts = normalizeLinkUrl(url).split("/").filter(Boolean);
    // github.com/user is a profile; github.com/org/repo belongs on a project.
    if (parts.length > 2) return "other";
    return "github";
  }
  if (/gitlab/.test(hay) || /gitlab\.com/.test(hay)) return "gitlab";
  if (
    /portfolio|personal site|website|homepage/.test(hay) ||
    (/\.(dev|me|io|app)\b/.test(hay) &&
      !/linkedin\.com|github\.com|gitlab\.com/.test(hay))
  ) {
    return "portfolio";
  }
  return "other";
}

export function defaultLabelForKind(kind: ParsedLinkKind): string {
  switch (kind) {
    case "linkedin":
      return "LinkedIn";
    case "github":
      return "GitHub";
    case "gitlab":
      return "GitLab";
    case "portfolio":
      return "Portfolio";
    default:
      return "Link";
  }
}

export function emptyParsedResume(): ParsedResume {
  return {
    profile: {
      fullName: "",
      headline: "",
      email: "",
      phone: "",
      location: "",
      links: [],
    },
    summary: "",
    experience: [],
    education: [],
    projects: [],
    skills: [],
  };
}

export function parseResumeText(raw: string, hint: ParseHint = {}): ParsedResume {
  const text = normalizeResumeText(raw);
  const parsed = emptyParsedResume();
  if (!text.trim()) {
    parsed.profile.links = mergeLinks([], hint.links ?? []);
    return parsed;
  }

  const lines = text.split("\n");
  const firstSection = lines.findIndex((line) => sectionOf(line));
  const headerLines = (firstSection === -1 ? lines : lines.slice(0, firstSection))
    .map((line) => line.trim())
    .filter(Boolean);
  const bodyLines = firstSection === -1 ? [] : lines.slice(firstSection);

  fillHeader(parsed, headerLines, text);
  parsed.profile.links = mergeLinks(
    parsed.profile.links,
    collectLinks(text, hint.links ?? []),
  );

  const sections = splitSections(bodyLines);
  if (sections.summary) parsed.summary = sections.summary.join(" ").trim();
  parsed.experience = parseExperience(sections.experience ?? []);
  parsed.education = parseEducation(sections.education ?? []);
  parsed.projects = parseProjects(sections.projects ?? []);
  parsed.skills = parseSkills(sections.skills ?? []);

  if (!parsed.profile.location) {
    const fromSchool = parsed.education.find((item) => item.location.trim());
    if (fromSchool) parsed.profile.location = fromSchool.location.trim();
  }

  attachProjectLinks(parsed.projects, parsed.profile.links);

  return parsed;
}

/** Human-readable list of what the parser actually found, for the review step. */
export function describeParsedResume(parsed: ParsedResume): string[] {
  const found: string[] = [];
  const { profile } = parsed;
  if (profile.fullName) found.push(`Name · ${profile.fullName}`);
  if (profile.headline) found.push(`Headline · ${profile.headline}`);
  if (profile.email) found.push(`Email · ${profile.email}`);
  if (profile.phone) found.push(`Phone · ${profile.phone}`);
  if (profile.location) found.push(`Location · ${profile.location}`);
  for (const link of profile.links) {
    found.push(`${link.label} · ${stripProtocol(link.url)}`);
  }
  if (parsed.summary) found.push(`Summary · ${flattenPreview(parsed.summary)}`);
  for (const item of parsed.education) {
    const bits = [item.school, item.degree, item.location, dateRange(item.start, item.end)]
      .map((part) => part.trim())
      .filter(Boolean);
    found.push(`Education · ${bits.join(" — ")}`);
    if (item.details.trim()) found.push(`  ${flattenPreview(item.details)}`);
  }
  for (const item of parsed.experience) {
    const title = [item.role, item.company].filter(Boolean).join(" · ");
    const when = dateRange(item.start, item.end);
    found.push(
      `Role · ${title}${when ? ` · ${when}` : ""} · ${item.bullets.length} bullet${item.bullets.length === 1 ? "" : "s"}`,
    );
    for (const bullet of item.bullets) found.push(`  ${flattenPreview(bullet)}`);
  }
  for (const item of parsed.projects) {
    const when = dateRange(item.start, item.end);
    found.push(
      `Project · ${item.name}${when ? ` · ${when}` : ""} · ${item.bullets.length} bullet${item.bullets.length === 1 ? "" : "s"}`,
    );
    if (item.tech.trim()) found.push(`  Tech · ${item.tech}`);
    if (item.link.trim()) found.push(`  Link · ${stripProtocol(item.link)}`);
    for (const bullet of item.bullets) found.push(`  ${flattenPreview(bullet)}`);
  }
  for (const group of parsed.skills) {
    found.push(`Skills · ${group.label}: ${group.skills.join(", ")}`);
  }
  return found;
}

function dateRange(start: string, end: string): string {
  if (start && end) return `${start} – ${end}`;
  return start || end || "";
}

function flattenPreview(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function parsedResumeIsEmpty(parsed: ParsedResume): boolean {
  return describeParsedResume(parsed).length === 0;
}

/* -------------------------------------------------------------------------- */
/*                                   Header                                   */
/* -------------------------------------------------------------------------- */

function fillHeader(parsed: ParsedResume, headerLines: string[], fullText: string) {
  const email = firstMatch(fullText, EMAIL_RE);
  const phone = firstMatch(fullText, PHONE_RE);
  if (email) parsed.profile.email = email;
  if (phone) parsed.profile.phone = normalizePhone(phone);

  const contactish = (line: string) =>
    EMAIL_RE.test(line) ||
    PHONE_RE.test(line) ||
    URL_RE.test(line) ||
    /^(linked\s*in|github|gitlab|portfolio|website)\b/i.test(line);

  const nameLine = headerLines.find(
    (line) => looksLikeName(line) && !contactish(line),
  );
  if (nameLine) parsed.profile.fullName = nameLine;

  const afterName = nameLine
    ? headerLines.slice(headerLines.indexOf(nameLine) + 1)
    : headerLines;

  const headline = afterName.find(
    (line) =>
      !contactish(line) &&
      !LOCATION_RE.test(line) &&
      line.length < 80 &&
      !/^\d/.test(line),
  );
  if (headline) parsed.profile.headline = headline;

  const locationLine = headerLines.find(
    (line) => TRAILING_CITY_RE.test(line) && !EMAIL_RE.test(line),
  );
  if (locationLine) {
    const match = TRAILING_CITY_RE.exec(locationLine);
    parsed.profile.location = match
      ? `${match[1]}, ${match[2]}`
      : locationLine.trim();
  }
}

function looksLikeName(line: string): boolean {
  if (line.length > 48 || line.length < 3) return false;
  if (/[0-9@/:_]/.test(line)) return false;
  const words = line.split(/\s+/);
  if (words.length < 2 || words.length > 5) return false;
  return words.every((word) => /^[A-Z][\p{L}'’.+-]*$/u.test(word));
}

/* -------------------------------------------------------------------------- */
/*                                    Links                                   */
/* -------------------------------------------------------------------------- */

function collectLinks(text: string, hinted: ParsedLink[]): ParsedLink[] {
  const found: ParsedLink[] = [...hinted];

  for (const match of text.matchAll(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+|(?:www\.)?[^)\s]+)\)/gi,
  )) {
    found.push({ label: match[1].trim(), url: match[2].trim() });
  }

  for (const match of text.matchAll(
    /\b(linked\s*in|github|gitlab|portfolio|personal site|website|site)\b\s*[:|—–-]\s*(\S+)/gi,
  )) {
    found.push({ label: match[1].trim(), url: match[2].trim() });
  }

  // "LinkedIn  linkedin.com/in/you" or a header row of labeled chips.
  for (const line of text.split("\n")) {
    const labeled = line.match(
      /^\s*(linked\s*in|github|gitlab|portfolio|website)\b\s+(\S+)/i,
    );
    if (labeled && URL_RE.test(labeled[2])) {
      found.push({ label: labeled[1], url: labeled[2] });
    }
  }

  const withoutEmails = text.replace(new RegExp(EMAIL_RE.source, "gi"), " ");
  for (const match of withoutEmails.matchAll(BARE_URL_RE)) {
    const url = match[0];
    if (!looksLikeUrl(url)) continue;
    found.push({ label: "", url });
  }

  return mergeLinks([], found);
}

function mergeLinks(base: ParsedLink[], incoming: ParsedLink[]): ParsedLink[] {
  const merged = [...base];

  for (const raw of incoming) {
    const url = normalizeLinkUrl(raw.url);
    if (!url) continue;
    const kind = classifyLink(raw.label, url);
    const label =
      raw.label.trim() && classifyLink(raw.label, "") !== "other"
        ? prettyLinkLabel(raw.label)
        : defaultLabelForKind(kind);

    const existing = merged.find((link) => {
      if (normalizeLinkUrl(link.url) === url) return true;
      const existingKind = classifyLink(link.label, link.url);
      return existingKind === kind && kind !== "other";
    });

    if (existing) {
      if (!existing.url) existing.url = url;
      if (!existing.label || existing.label === "Link") existing.label = label;
      continue;
    }

    merged.push({ label, url });
  }

  return merged;
}

function prettyLinkLabel(label: string): string {
  const kind = classifyLink(label, "");
  if (kind !== "other") return defaultLabelForKind(kind);
  return label.replace(/\s+/g, " ").trim();
}

export function normalizeLinkUrl(input: string): string {
  let url = input.trim().replace(/[),.;]+$/, "");
  if (!url || EMAIL_RE.test(url) || !looksLikeUrl(url)) return "";
  url = url.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  return url;
}

function looksLikeUrl(token: string): boolean {
  const trimmed = token.trim().replace(/[),.;]+$/, "");
  if (!trimmed || EMAIL_RE.test(trimmed)) return false;
  if (/^https?:\/\//i.test(trimmed) || /^www\./i.test(trimmed)) return true;
  if (/linkedin\.com|github\.com|gitlab\.com/i.test(trimmed)) return true;
  if (!URL_RE.test(trimmed)) return false;
  const host = trimmed.replace(/^https?:\/\//i, "").split("/")[0] ?? "";
  const tld = host.split(".").pop() ?? "";
  if (FAKE_TLDS.test(tld)) return false;
  return REAL_TLDS.test(tld);
}

export function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
}

/* -------------------------------------------------------------------------- */
/*                                  Sections                                  */
/* -------------------------------------------------------------------------- */

function splitSections(lines: string[]): Partial<Record<SectionKey, string[]>> {
  const buckets: Partial<Record<SectionKey, string[]>> = {};
  let current: SectionKey | null = null;

  for (const raw of lines) {
    const section = sectionOf(raw);
    if (section) {
      current = section;
      buckets[current] ??= [];
      continue;
    }
    if (!current) continue;
    buckets[current]!.push(raw);
  }

  return buckets;
}

function sectionOf(line: string): SectionKey | null {
  const cleaned = line
    .trim()
    .replace(/^[#*_=\-–—\s]+|[#*_=\-–—\s]+$/g, "")
    .replace(/:+$/, "")
    .toLowerCase();
  return SECTION_ALIASES[cleaned] ?? null;
}

function parseExperience(lines: string[]): ParsedExperience[] {
  return chunkEntries(lines, true).flatMap((chunk) => {
    const { title, rest } = peelTitle(chunk);
    if (!title) return [];
    const dated = peelInlineDate(title);
    const { role, company, location } = splitRoleCompany(dated.text);
    if (!role && !company) return [];
    const { start, end, leftover } = peelDates(rest);
    return [
      {
        role,
        company,
        location,
        start: start || dated.start,
        end: end || dated.end,
        bullets: mergeWrappedBullets(leftover),
      },
    ];
  });
}

function parseEducation(lines: string[]): ParsedEducation[] {
  return chunkEntries(lines).flatMap((chunk) => {
    const { title, rest } = peelTitle(chunk);
    if (!title) return [];
    const { heading, location: trailingLocation } = peelTrailingLocation(title);
    const { role: degree, company: school, location } = splitRoleCompany(heading);
    const { start, end, leftover } = peelDates(rest);
    const datedLeftover = leftover.map((line) => peelInlineDate(line));
    const expected = datedLeftover.find((item) => /^expected\b/i.test(item.start));
    const degreeFromBody = datedLeftover
      .map((item) => item.text)
      .filter(Boolean)
      .join(" ");
    const schoolName = school || degree;
    const degreeName = school ? degree : degreeFromBody;
    return [
      {
        school: schoolName,
        degree: degreeName,
        location: location || trailingLocation,
        start: start || expected?.start || datedLeftover.find((item) => item.start)?.start || "",
        end,
        details: school && degreeFromBody && degreeFromBody !== degree ? degreeFromBody : "",
      },
    ];
  });
}

function peelTrailingLocation(title: string): { heading: string; location: string } {
  const trailing = title.match(
    /^(?:(.*\S)\s+)?((?:(?:New|San|Los|Fort|Saint|North|South|West|East)\s+)?[A-Z][a-zA-Z.'-]+,\s*[A-Z]{2})\s*$/,
  );
  if (trailing?.[2]) {
    return {
      heading: (trailing[1] ?? "").trim(),
      location: trailing[2].trim(),
    };
  }
  return { heading: title, location: "" };
}

function parseProjects(lines: string[]): ParsedProject[] {
  return chunkEntries(lines, true).flatMap((chunk) => {
    const { title, rest } = peelTitle(chunk);
    if (!title) return [];
    const dated = peelInlineDate(title);
    const linkLine = rest.find((line) => URL_RE.test(line) && !BULLET_RE.test(line));
    const techLine = rest.find(
      (line) =>
        line !== linkLine &&
        !BULLET_RE.test(line) &&
        /[·•]/.test(line) &&
        line.length < 220,
    );
    const techMatch = dated.text.match(/^(.*?)\s*\((.+)\)\s*$/);
    const name = (techLine ? dated.text : (techMatch?.[1] ?? dated.text)).trim();
    const tech = techLine
      ? techLine
          .split(/[·•]/)
          .map((part) => part.trim())
          .filter(Boolean)
          .join(", ")
      : (techMatch?.[2]?.trim() ?? "");
    const { start, end, leftover } = peelDates(
      rest.filter((line) => line !== linkLine && line !== techLine),
    );
    return [
      {
        name,
        tech,
        link: linkLine ? normalizeLinkUrl(firstMatch(linkLine, URL_RE) ?? linkLine) : "",
        start: start || dated.start,
        end: end || dated.end,
        bullets: mergeWrappedBullets(leftover),
      },
    ];
  });
}

function parseSkills(lines: string[]): ParsedSkillGroup[] {
  const groups: ParsedSkillGroup[] = [];
  for (const line of lines.map((item) => item.trim()).filter(Boolean)) {
    const labeled = line.match(/^([^:]{1,40}):\s*(.+)$/);
    if (labeled) {
      const skills = splitSkills(labeled[2]);
      if (skills.length) groups.push({ label: labeled[1].trim(), skills });
      continue;
    }
    const skills = splitSkills(line);
    if (skills.length) {
      const last = groups.at(-1);
      if (last) last.skills.push(...skills);
      else groups.push({ label: "Skills", skills });
    }
  }
  return groups;
}

function splitSkills(line: string): string[] {
  return line
    .split(/[,;|•·]/)
    .map((skill) => skill.replace(/\s+/g, " ").trim())
    .filter((skill) => skill.length > 0 && skill.length < 48);
}

/* -------------------------------------------------------------------------- */
/*                                   Chunks                                   */
/* -------------------------------------------------------------------------- */

function chunkEntries(lines: string[], splitOnHeading = false): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];

  const flush = () => {
    if (current.length) chunks.push(current);
    current = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (splitOnHeading && current.length > 0 && looksLikeEntryHeading(line)) {
      flush();
    }
    current.push(line);
  }
  flush();
  return chunks;
}

function looksLikeEntryHeading(line: string): boolean {
  if (BULLET_RE.test(line)) return false;
  if (looksLikeTechLine(line)) return false;
  if (TRAILING_DATE_RE.test(line) || DATE_RANGE_RE.test(line)) return true;
  return (
    /^[A-Z][\w].{1,90}$/.test(line) &&
    !line.includes(":") &&
    line.split(/\s+/).length <= 12
  );
}

function looksLikeTechLine(line: string): boolean {
  return /[·]/.test(line) && !BULLET_RE.test(line) && line.length < 220;
}

function peelInlineDate(line: string): { text: string; start: string; end: string } {
  if (/^expected\b/i.test(line.trim())) {
    return { text: "", start: line.trim(), end: "" };
  }
  const expected = line.match(/\s+(Expected\s+.+)$/i);
  if (expected && expected.index !== undefined) {
    return {
      text: line.slice(0, expected.index).trim(),
      start: expected[1].trim(),
      end: "",
    };
  }
  const range = TRAILING_DATE_RE.exec(line);
  if (range && range.index !== undefined && range.index > 0) {
    return {
      text: line.slice(0, range.index).trim(),
      start: (range[2] ?? range[1] ?? "").trim(),
      end: (range[3] ?? "").trim(),
    };
  }
  return { text: line.trim(), start: "", end: "" };
}

function mergeWrappedBullets(lines: string[]): string[] {
  const bullets: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || looksLikeTechLine(line)) continue;
    if (BULLET_RE.test(line)) {
      bullets.push(cleanPlain(stripBullet(line)));
      continue;
    }
    if (bullets.length) {
      bullets[bullets.length - 1] = cleanPlain(`${bullets[bullets.length - 1]} ${line}`);
    } else if (line.length > 40) {
      bullets.push(cleanPlain(line));
    }
  }
  return bullets;
}

function cleanPlain(text: string): string {
  return text.replace(/˜/g, "~").replace(/\s+/g, " ").trim();
}

function attachProjectLinks(projects: ParsedProject[], links: ParsedLink[]) {
  const leftover: ParsedLink[] = [];
  for (const link of links) {
    if (classifyLink(link.label, link.url) !== "other" || !link.url) {
      leftover.push(link);
      continue;
    }
    const url = link.url.toLowerCase();
    const project = projects.find((item) => {
      if (item.link) return false;
      const tokens = item.name.toLowerCase().split(/[^a-z0-9]+/).filter((part) => part.length > 4);
      return tokens.some((token) => url.includes(token));
    });
    if (project) project.link = link.url;
    else leftover.push(link);
  }
  links.length = 0;
  links.push(...leftover);
}

function peelTitle(chunk: string[]): { title: string; rest: string[] } {
  const title = chunk.find((line) => !BULLET_RE.test(line) && !DATE_RANGE_RE.test(line));
  if (!title) return { title: "", rest: chunk };
  return { title, rest: chunk.filter((line) => line !== title) };
}

function splitRoleCompany(title: string): {
  role: string;
  company: string;
  location: string;
} {
  const em = title.match(/^(.+?)\s+[—–-]\s+(.+)$/);
  if (em) {
    const right = em[2];
    const loc = right.match(/^(.*?),\s*([^,]+,[^,]+|[^,]+)$/);
    if (loc) {
      return { role: em[1].trim(), company: loc[1].trim(), location: loc[2].trim() };
    }
    return { role: em[1].trim(), company: right.trim(), location: "" };
  }

  const pipes = title.split("|").map((part) => part.trim()).filter(Boolean);
  if (pipes.length >= 2) {
    return {
      role: pipes[0],
      company: pipes[1],
      location: pipes[2] ?? "",
    };
  }

  const at = title.match(/^(.+?)\s+at\s+(.+)$/i);
  if (at) return { role: at[1].trim(), company: at[2].trim(), location: "" };

  return { role: title.trim(), company: "", location: "" };
}

function peelDates(lines: string[]): {
  start: string;
  end: string;
  leftover: string[];
} {
  const index = lines.findIndex((line) => DATE_RANGE_RE.test(line.trim()));
  if (index === -1) return { start: "", end: "", leftover: lines };
  const match = DATE_RANGE_RE.exec(lines[index].trim());
  return {
    start: match?.[1]?.trim() ?? "",
    end: match?.[2]?.trim() ?? "",
    leftover: lines.filter((_, i) => i !== index),
  };
}

function stripBullet(line: string): string {
  return line.replace(BULLET_RE, "").trim();
}

/* -------------------------------------------------------------------------- */
/*                                   Text                                     */
/* -------------------------------------------------------------------------- */

function normalizeResumeText(input: string): string {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function firstMatch(text: string, regex: RegExp): string | undefined {
  const match = regex.exec(text);
  return match?.[0];
}

function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return input.trim();
}
