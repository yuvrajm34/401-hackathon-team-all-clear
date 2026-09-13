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
  "summary of qualifications": "summary",
  "career summary": "summary",
  "profile summary": "summary",
  profile: "summary",
  about: "summary",
  "about me": "summary",
  objective: "summary",
  "career objective": "summary",
  highlights: "summary",
  experience: "experience",
  "work experience": "experience",
  "work history": "experience",
  employment: "experience",
  "employment history": "experience",
  "professional experience": "experience",
  "relevant experience": "experience",
  "internship experience": "experience",
  internships: "experience",
  education: "education",
  academic: "education",
  academics: "education",
  "education & training": "education",
  "education and training": "education",
  projects: "projects",
  "personal projects": "projects",
  "selected projects": "projects",
  "side projects": "projects",
  "academic projects": "projects",
  "notable projects": "projects",
  "key projects": "projects",
  skills: "skills",
  "technical skills": "skills",
  "tech stack": "skills",
  technologies: "skills",
  "technical skill": "skills",
  "core competencies": "skills",
  "areas of expertise": "skills",
  "technical proficiencies": "skills",
  "additional skills": "skills",
  "skills & interests": "skills",
  "skills and interests": "skills",
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

/**
 * Common countries, for recognizing a "City Country" header line with no
 * comma (e.g. "Edmonton Canada") — `LOCATION_RE` alone requires a comma
 * and misses this, which used to fall through and get misread as the
 * headline. Not exhaustive; just common enough to catch the typical case.
 */
const COUNTRY_NAMES = new Set(
  [
    "canada",
    "usa",
    "us",
    "united states",
    "uk",
    "united kingdom",
    "england",
    "scotland",
    "ireland",
    "india",
    "australia",
    "germany",
    "france",
    "spain",
    "italy",
    "mexico",
    "brazil",
    "china",
    "japan",
    "singapore",
    "netherlands",
    "sweden",
    "switzerland",
    "new zealand",
  ].map((name) => name.toLowerCase()),
);

/**
 * A short, capitalized-words line with no punctuation that ends in a known
 * country name — the no-comma equivalent of `LOCATION_RE`. Reuses the same
 * word-shape as `looksLikeName` (2-4 capitalized words) since a bare
 * "City Country" line looks identical in shape to a person's name; the
 * country-name check is what disambiguates it.
 */
function looksLikeBareLocation(line: string): boolean {
  if (!looksLikeName(line)) return false;
  const words = line.trim().split(/\s+/);
  const lastWord = words.at(-1)?.toLowerCase() ?? "";
  const lastTwoWords = words.slice(-2).join(" ").toLowerCase();
  return COUNTRY_NAMES.has(lastWord) || COUNTRY_NAMES.has(lastTwoWords);
}

// A redacted-placeholder year ("20XX"/"19XX") that sample/template resumes
// use in place of a real date — MIT career center's widely-used sample
// resumes (this one among them) are the common case, but any anonymized
// template does the same. Without this, every date on that kind of resume
// is invisible to the date regexes below, since a literal "X" isn't a
// digit. Only added where a real year could otherwise go — a bare 2-digit
// placeholder isn't supported since "XX" alone is too easily a false
// positive outside a year's specific 4-digit shape.
const PLACEHOLDER_YEAR = "(?:19|20)XX";
const DATE_TOKEN =
  "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|[0-3]?\\d)(?:[./\\s-](?:\\d{2,4}|" +
  PLACEHOLDER_YEAR +
  "))?|(?:\\d{4}|" +
  PLACEHOLDER_YEAR +
  ")";
// Separator between the two ends of a date range — either a dash of some
// kind or the literal word "to" ("Jan 2024 to Present"), which is at least
// as common on real resumes as an en/em dash.
const DATE_SEP = "(?:[–—-]+|to)";
const DATE_RANGE_RE = new RegExp(
  `^(${DATE_TOKEN})\\s*${DATE_SEP}\\s*(${DATE_TOKEN}|Present|Current|Now|Ongoing)$`,
  "i",
);
// The 4th alternative (a lone trailing date, no range) matters for short
// entries a resume lists with just one timestamp instead of a start-end
// range — a single-month internship, a one-off event, etc. ("Robotics
// Company    January 20XX"). Without it, a line like that never gets its
// date peeled off at all, so the whole messy "Company   Date" string ends
// up mistaken for the role with no company, and the real title on the next
// line is passed to `parseStackedHeader` — but only when a date was
// actually found there, so this line silently skipped that path entirely.
const TRAILING_DATE_RE = new RegExp(
  `\\s+(?:(Expected\\s+.+)|(?:(${DATE_TOKEN})\\s*${DATE_SEP}\\s*(${DATE_TOKEN}|Present|Current|Now|Ongoing))|(${DATE_TOKEN}))$`,
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

  // Location: try the precise "City, ST"/"City, Country" pattern first,
  // then the no-comma "City Country" shape. Both are scoped to the header
  // only — never the whole document, which is how a coincidental
  // "Word, Word" pattern deep in the Skills or Summary section (e.g.
  // "Java, Python") used to get misread as the candidate's location.
  // Note: deliberately not excluding lines that also contain an email —
  // "email | phone | Boston, MA" on one combined contact line is common,
  // and LOCATION_RE's own shape (capitalized word + comma + state/country)
  // doesn't false-match inside an email address.
  const commaLocationLine = headerLines.find((line) => LOCATION_RE.test(line));
  const bareLocationLine = !commaLocationLine
    ? afterName.find((line) => !contactish(line) && looksLikeBareLocation(line))
    : undefined;

  if (commaLocationLine) {
    const match = LOCATION_RE.exec(commaLocationLine);
    parsed.profile.location = (match?.[1] ?? commaLocationLine).trim();
  } else if (bareLocationLine) {
    parsed.profile.location = bareLocationLine.trim();
  }
  const locationLine = commaLocationLine ?? bareLocationLine;

  const headline = afterName.find(
    (line) =>
      line !== locationLine &&
      !contactish(line) &&
      !LOCATION_RE.test(line) &&
      !looksLikeBareLocation(line) &&
      line.length < 80 &&
      !/^\d/.test(line),
  );
  if (headline) parsed.profile.headline = headline;
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

/** Known hosts for labels that resumes often show as a bare slug next to an
 * icon (e.g. "LinkedIn  in/janedoe" or "GitHub  janedoe") instead of a full
 * URL — the reader is expected to infer the domain from the icon/label. */
const PLATFORM_DOMAINS: Record<string, string> = {
  linkedin: "linkedin.com",
  github: "github.com",
  gitlab: "gitlab.com",
};

/** Reconstructs a full URL for a label + adjacent token when the token by
 * itself doesn't look like a URL (no dot/TLD) but the label names a known
 * platform. Returns "" when nothing usable can be built. */
function resolvePlatformUrl(label: string, token: string): string {
  const cleaned = token.trim().replace(/[),.;]+$/, "");
  if (!cleaned) return "";
  if (looksLikeUrl(cleaned)) return cleaned;

  const domain = PLATFORM_DOMAINS[classifyLink(label, "")];
  if (!domain) return "";
  // "in/janedoe", "/in/janedoe", or just "janedoe" all resolve the same way.
  const path = cleaned.replace(/^\/+/, "");
  return looksLikeUrl(`${domain}/${path}`) ? `${domain}/${path}` : "";
}

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
    const url = resolvePlatformUrl(match[1], match[2].trim());
    if (url) found.push({ label: match[1].trim(), url });
  }

  // "LinkedIn  linkedin.com/in/you" or a header row of labeled chips —
  // including the bare-slug form ("LinkedIn  in/janedoe").
  for (const line of text.split("\n")) {
    const labeled = line.match(
      /^\s*(linked\s*in|github|gitlab|portfolio|website)\b\s+(\S+)/i,
    );
    if (!labeled) continue;
    const url = resolvePlatformUrl(labeled[1], labeled[2]);
    if (url) found.push({ label: labeled[1], url });
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
    if (section === "ignore") {
      // A recognized header for something the schema has no field for
      // (Hobbies, Volunteering, Certifications, ...). Stop collecting into
      // whatever section came before it — without this, its content used
      // to leak into the previous section (e.g. hobbies landing inside a
      // bogus extra "education" entry) instead of just being dropped.
      current = null;
      continue;
    }
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

/**
 * Substring stems for section headers the exact-match alias list doesn't
 * cover — a fallback for wording like "Where I've Worked" or "Educational
 * Background" that no fixed phrase list can fully enumerate. Deliberately
 * conservative (only applied to short, heading-shaped lines in
 * `sectionOf`) to avoid misclassifying ordinary body text.
 */
// Order matters: `sectionOf` returns the first matching key below, so a
// heading matching more than one stem list resolves to whichever key comes
// first here. `projects` is listed first because it's the most specific,
// least ambiguous stem ("project") — a heading like "Relevant Project
// Experience" or "Academic Projects" also contains "experien"/"academ" and
// would otherwise resolve to the wrong, more generic section.
const SECTION_STEMS: Record<SectionKey, string[]> = {
  projects: ["project"],
  summary: ["summar", "objective", "profile", "highlight", "qualificat"],
  experience: ["experien", "employ", "work histor", "career", "worked"],
  education: ["educat", "academ", "school", "degree", "universit", "colleg"],
  skills: [
    "skill",
    "technical",
    "competenc",
    "proficien",
    "technolog",
    "tech stack",
    "expertise",
  ],
};

/**
 * Common job-title suffixes. A short line ending in one of these ("Education
 * Design Intern", "Marketing Coordinator") is virtually always a role title
 * inside an entry, never a section heading — even though it may otherwise
 * pass every other heading-shaped check below (short, no punctuation, and
 * happens to contain a section stem like "educat"). Without this guard, a
 * title like that gets misread as a new "Education" section header mid
 * Experience, which both loses the title itself and drags everything after
 * it into the wrong section.
 */
const JOB_TITLE_SUFFIX_RE =
  /\b(intern|manager|director|engineer|coordinator|associate|analyst|specialist|officer|assistant|lead|consultant|designer|developer|architect|scientist|researcher|producer|strategist)$/i;

/**
 * Headers for content the schema has no field for. Recognizing these (and
 * returning "ignore") matters just as much as recognizing real sections —
 * without it, this content silently gets attributed to whatever section
 * came before it (e.g. "Hobbies & Interests" landing inside a bogus extra
 * Education entry) instead of being cleanly dropped.
 */
const IGNORED_SECTION_ALIASES = new Set([
  "hobbies",
  "hobbies and interests",
  "hobbies & interests",
  "interests",
  "activities",
  "extracurricular",
  "extracurriculars",
  "extracurricular activities",
  "volunteer",
  "volunteering",
  "volunteer experience",
  "certifications",
  "certificates",
  "awards",
  "awards and honors",
  "honors",
  "honors and awards",
  "publications",
  "references",
  "languages",
  "leadership",
]);
const IGNORED_SECTION_STEMS = [
  "hobbies",
  "interest",
  "extracurricular",
  "volunteer",
  "certif",
  "publicat",
  "reference",
  "leadership",
];

function sectionOf(line: string): SectionKey | "ignore" | null {
  const cleaned = line
    .trim()
    .replace(/^[#*_=\-–—\s]+|[#*_=\-–—\s]+$/g, "")
    .replace(/:+$/, "")
    .toLowerCase();
  if (!cleaned) return null;

  const exact = SECTION_ALIASES[cleaned];
  if (exact) return exact;
  if (IGNORED_SECTION_ALIASES.has(cleaned)) return "ignore";

  // Fuzzy fallback: only for short, heading-shaped lines (a handful of
  // words, no sentence-ending punctuation, no comma/dash/pipe) — a bullet
  // or entry title line ("Northeastern University — Boston, MA") that
  // happens to contain a stem word shouldn't be misread as a new section
  // header. Real section headers essentially never contain that kind of
  // punctuation; entry titles (school/company — location) almost always do.
  if (cleaned.length > 40 || /[.!?,|—–]/.test(cleaned)) return null;
  const wordCount = cleaned.split(/\s+/).filter(Boolean).length;
  if (wordCount > 5) return null;
  if (JOB_TITLE_SUFFIX_RE.test(cleaned)) return null;

  if (IGNORED_SECTION_STEMS.some((stem) => cleaned.includes(stem))) {
    return "ignore";
  }

  for (const key of Object.keys(SECTION_STEMS) as SectionKey[]) {
    if (SECTION_STEMS[key].some((stem) => cleaned.includes(stem))) {
      return key;
    }
  }
  return null;
}

/**
 * Handles a job header stacked across three lines instead of one —
 * "Company Name  Jan 2024 to Present" / "Job Title" / "City, ST" — rather
 * than the usual single "Role — Company, Location" line. `splitRoleCompany`
 * has no separator to work with here (no "—"/"|"/"at"), so it dumps the
 * whole line into "role" with an empty "company" — the caller detects that
 * shape (a trailing date but no company found) and hands off here so the
 * real title on the next line isn't silently dropped as leftover text.
 */
function parseStackedHeader(
  company: string,
  rest: string[],
  start: string,
  end: string,
): ParsedExperience | null {
  const cleanedCompany = company.trim().replace(/[\s,—–|-]+$/, "");
  if (!cleanedCompany) return null;

  let remaining = [...rest];

  const roleLine = remaining.find(
    (line) =>
      !BULLET_RE.test(line) && !DATE_RANGE_RE.test(line) && line.length < 60,
  );
  const role = roleLine ?? "";
  if (roleLine) remaining = remaining.filter((line) => line !== roleLine);

  const locationLine = remaining.find(
    (line) =>
      !BULLET_RE.test(line) &&
      (LOCATION_RE.test(line) || looksLikeBareLocation(line)),
  );
  let location = "";
  if (locationLine) {
    const match = LOCATION_RE.exec(locationLine);
    location = (match?.[1] ?? locationLine).trim();
    remaining = remaining.filter((line) => line !== locationLine);
  }

  return {
    role,
    company: cleanedCompany,
    location,
    start,
    end,
    bullets: mergeWrappedBullets(remaining),
  };
}

function parseExperience(lines: string[]): ParsedExperience[] {
  return chunkEntries(lines, { detectRunOn: true }).flatMap((rawChunk) => {
    const chunk = dropLeadingNameLine(rawChunk);
    const { title, rest } = peelTitle(chunk);
    if (!title) return [];
    const dated = peelInlineDate(title);
    const { role, company, location } = splitRoleCompany(dated.text);
    if (!role && !company) return [];

    if (dated.start && !company) {
      const stacked = parseStackedHeader(role, rest, dated.start, dated.end);
      if (stacked) return [stacked];
    }

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
  return chunkEntries(lines).flatMap((rawChunk) => {
    const chunk = dropLeadingNameLine(rawChunk);
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
  const match = LOCATION_RE.exec(title);
  if (!match || match.index === undefined || match.index === 0) {
    return { heading: title, location: "" };
  }
  return {
    heading: title
      .slice(0, match.index)
      .replace(/[\s,—–|-]+$/, "")
      .trim(),
    location: (match[1] ?? match[0]).trim(),
  };
}

// A labeled tech line ("Skills: Rhino3D, Grasshopper, VRay") that lists
// tools with commas instead of the "·"/"•" separator `techLine` below
// looks for. Without this, that line has nowhere to go, so it falls
// through into `mergeWrappedBullets` and gets glued onto the project's
// first real bullet as if it were sentence continuation text.
const LABELED_TECH_RE = /^(?:skills?|tech(?:nologies|nology|stack)?|tools?)\s*:\s*(.+)$/i;

function parseProjects(lines: string[]): ParsedProject[] {
  return chunkEntries(lines, { detectRunOn: true }).flatMap((chunk) => {
    const { title, rest } = peelTitle(chunk);
    if (!title) return [];
    const dated = peelInlineDate(title);
    const linkLine = rest.find((line) => URL_RE.test(line) && !BULLET_RE.test(line));
    const dotTechLine = rest.find(
      (line) =>
        line !== linkLine &&
        !BULLET_RE.test(line) &&
        /[·•]/.test(line) &&
        line.length < 220,
    );
    const labeledTechLine = dotTechLine
      ? undefined
      : rest.find(
          (line) =>
            line !== linkLine && !BULLET_RE.test(line) && LABELED_TECH_RE.test(line),
        );
    const techLine = dotTechLine ?? labeledTechLine;
    const techMatch = dated.text.match(/^(.*?)\s*\((.+)\)\s*$/);
    const name = (techLine ? dated.text : (techMatch?.[1] ?? dated.text)).trim();
    const tech = dotTechLine
      ? dotTechLine
          .split(/[·•]/)
          .map((part) => part.trim())
          .filter(Boolean)
          .join(", ")
      : labeledTechLine
        ? (labeledTechLine.match(LABELED_TECH_RE)?.[1] ?? "")
            .split(/[,;]/)
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
  for (const raw of lines.map((item) => item.trim()).filter(Boolean)) {
    // Bulleted skill-group labels ("• Programming Languages: Java, Python")
    // need the bullet stripped first — otherwise it becomes part of the
    // captured label ("• Programming Languages" instead of "Programming
    // Languages") since the label pattern itself has no bullet awareness.
    const line = stripBullet(raw);
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

/**
 * Groups a section's lines into one array per entry.
 *
 * Blank lines always split. When `detectRunOn` is set, a chunk also splits
 * mid-stream when a title-like line shows up with no blank line before it
 * (e.g. two projects back-to-back with no gap in the source text — mainly
 * relevant for DOCX/plain-text input, since PDF extraction now inserts
 * real blank lines between entries using actual page geometry — see
 * `reconstructTextFromLayout` in resume-extract.ts).
 *
 * Deliberately narrow: only `looksLikeNewEntryTitle` (a trailing
 * parenthetical) counts as a boundary. An earlier version also treated
 * *any* non-bullet line after a bullet as a new entry, which seemed safe
 * but wasn't — a long bullet that simply wraps onto a second line is also
 * "a non-bullet line after a bullet", and that broader rule was splitting
 * ordinary wrapped bullets into bogus extra entries.
 */
function chunkEntries(
  lines: string[],
  options: { detectRunOn?: boolean } = {},
): string[][] {
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
    const trimmed = line.trim();
    const isBullet = BULLET_RE.test(trimmed);

    if (
      options.detectRunOn &&
      current.length > 0 &&
      !isBullet &&
      !DATE_RANGE_RE.test(trimmed) &&
      (looksLikeNewEntryTitle(trimmed) || looksLikeEntryHeading(trimmed))
    ) {
      flush();
    }

    current.push(trimmed);
  }
  flush();
  return chunks;
}

/**
 * A line that reads as a new entry's heading (has its own trailing date,
 * e.g. "Acme Corp  Jan 2024 – Present") rather than a wrapped bullet
 * continuation. Deliberately narrow — an earlier, broader version also
 * matched any short capitalized sentence with no colon, which reintroduced
 * exactly the bug `looksLikeNewEntryTitle`'s docstring warns about: an
 * ordinary bullet that wraps onto a second line often *also* looks like
 * "a short capitalized sentence", so that rule was splitting single roles
 * into bogus fragmented entries. A trailing date is a much rarer, safer
 * signal to anchor on.
 */
function looksLikeEntryHeading(line: string): boolean {
  if (BULLET_RE.test(line) || looksLikeTechLine(line)) return false;
  return TRAILING_DATE_RE.test(line);
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
      start: (range[2] ?? range[4] ?? range[1] ?? "").trim(),
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

/**
 * A title-like line seen mid-chunk (not the chunk's own first line) that
 * strongly signals a new entry is starting — e.g. "Weather Dashboard
 * (Python, Flask)" right after a previous project's bullets, with no blank
 * line in between. Deliberately narrow (trailing parenthetical only) to
 * avoid splitting an ordinary detail line such as "B.S. in Computer
 * Science — Systems concentration".
 */
function looksLikeNewEntryTitle(line: string): boolean {
  return /\s\([^()]+\)\s*$/.test(line) && line.length < 100;
}

/**
 * Strips a leading line that is the candidate's own name — e.g. a repeated
 * page-break header from PDF text extraction landing at the top of an
 * Education/Experience entry. Only ever drops chunk[0]: a company or school
 * that happens to be a person's name is exceedingly rare, but a name
 * literally opening the chunk right before real content is a known PDF
 * extraction artifact.
 */
function dropLeadingNameLine(chunk: string[]): string[] {
  if (chunk.length > 1 && looksLikeName(chunk[0])) return chunk.slice(1);
  return chunk;
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
