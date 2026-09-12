/**
 * Reads the Jake Gutierrez / sb2nov Overleaf resume (and ApplyPath's own
 * .tex export). `\href{url}{LinkedIn}` keeps the written label with the URL
 * so those rows fill instead of becoming anonymous links.
 */

import {
  classifyLink,
  defaultLabelForKind,
  emptyParsedResume,
  normalizeLinkUrl,
  type ParsedEducation,
  type ParsedExperience,
  type ParsedLink,
  type ParsedProject,
  type ParsedResume,
  type ParsedSkillGroup,
} from "./resume-parse";

const WRAPPERS = new Set([
  "textbf",
  "textit",
  "emph",
  "underline",
  "textsc",
  "texttt",
  "textrm",
  "textsf",
  "text",
  "small",
  "large",
  "Large",
  "LARGE",
  "huge",
  "Huge",
  "tiny",
  "footnotesize",
]);

const SWITCHES = new Set([
  "scshape",
  "bfseries",
  "itshape",
  "mdseries",
  "ttfamily",
  "rmfamily",
  "sffamily",
  "normalfont",
  "centering",
  "raggedright",
  "raggedleft",
]);

const DATEISH =
  /expected|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b|\b20\d{2}\b|present|current|ongoing/i;

export function looksLikeLatexResume(source: string): boolean {
  return (
    /\\documentclass/.test(source) ||
    /\\resumeSubheading/.test(source) ||
    /\\resumeProjectHeading/.test(source) ||
    /\\begin\{document\}/.test(source)
  );
}

export function parseLatexResume(source: string): ParsedResume {
  const parsed = emptyParsedResume();
  const body = sliceDocument(source);

  const hrefs = collectHrefs(body);
  parsed.profile.email =
    hrefs.find((link) => link.url.startsWith("mailto:"))?.url.replace(/^mailto:/i, "") ??
    firstEmail(body);
  parsed.profile.links = hrefs
    .filter((link) => !link.url.startsWith("mailto:"))
    .filter((link) => isProfileHref(link))
    .map((link) => ({
      label: link.label || defaultLabelForKind(classifyLink(link.label, link.url)),
      url: normalizeLinkUrl(link.url),
    }))
    .filter((link) => link.url);

  const phone = firstPhone(latexToPlain(headingBlock(body)));
  if (phone) parsed.profile.phone = phone;

  const name = firstName(body);
  if (name) parsed.profile.fullName = name;

  const sections = splitLatexSections(body);
  for (const [title, content] of sections) {
    const key = sectionKey(title);
    if (key === "education") parsed.education.push(...parseEducation(content));
    if (key === "experience") parsed.experience.push(...parseExperience(content));
    if (key === "projects") parsed.projects.push(...parseProjects(content));
    if (key === "skills") parsed.skills.push(...parseSkills(content));
    if (key === "summary") {
      const text = latexToPlain(content);
      if (text) parsed.summary = text;
    }
  }

  if (!parsed.profile.location) {
    const fromSchool = parsed.education.find((item) => item.location.trim());
    if (fromSchool) parsed.profile.location = fromSchool.location.trim();
  }

  return parsed;
}

function sliceDocument(source: string): string {
  const start = source.search(/\\begin\{document\}/);
  const end = source.search(/\\end\{document\}/);
  if (start === -1) return source;
  const from = start + "\\begin{document}".length;
  return end === -1 ? source.slice(from) : source.slice(from, end);
}

function headingBlock(body: string): string {
  const firstSection = body.search(/\\section\s*\{/);
  return firstSection === -1 ? body : body.slice(0, firstSection);
}

function firstName(body: string): string {
  const huge = body.match(/\\textbf\s*\{[^{}]*\\(?:Huge|huge|scshape)[^{}]*\}/);
  if (huge) {
    const plain = latexToPlain(huge[0]);
    if (plain) return plain;
  }
  const bold = [...body.matchAll(/\\textbf\s*\{/g)];
  for (const match of bold) {
    const group = readGroup(body, match.index! + match[0].length - 1);
    if (!group) continue;
    const plain = latexToPlain(group.value);
    if (/^[A-Z][\p{L}'’. -]{1,40}$/u.test(plain) && plain.split(/\s+/).length >= 2) {
      return plain;
    }
  }
  return "";
}

/** Profile rows only: the word LinkedIn/GitHub, not a project hosted on GitHub. */
function isProfileHref(link: ParsedLink): boolean {
  if (classifyLink(link.label, "") !== "other") return true;
  const kind = classifyLink("", link.url);
  if (kind === "linkedin" || kind === "gitlab" || kind === "portfolio") return true;
  if (kind !== "github") return false;
  const parts = normalizeLinkUrl(link.url).split("/").filter(Boolean);
  return parts.length <= 2;
}

function collectHrefs(source: string): ParsedLink[] {
  const found: ParsedLink[] = [];
  let index = 0;
  while (index < source.length) {
    const at = source.indexOf("\\href", index);
    if (at === -1) break;
    const urlGroup = readGroup(source, skipWs(source, at + 5));
    if (!urlGroup) {
      index = at + 5;
      continue;
    }
    const textGroup = readGroup(source, skipWs(source, urlGroup.end));
    if (!textGroup) {
      index = urlGroup.end;
      continue;
    }
    found.push({
      label: latexToPlain(textGroup.value),
      url: urlGroup.value.trim(),
    });
    index = textGroup.end;
  }
  return found;
}

function splitLatexSections(body: string): [string, string][] {
  const matches = [...body.matchAll(/\\section\s*\{/g)];
  const sections: [string, string][] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index!;
    const titleGroup = readGroup(body, skipWs(body, start + "\\section".length));
    if (!titleGroup) continue;
    const next = matches[i + 1]?.index ?? body.length;
    sections.push([latexToPlain(titleGroup.value), body.slice(titleGroup.end, next)]);
  }
  return sections;
}

function sectionKey(title: string): string {
  const cleaned = title.toLowerCase();
  if (/educat/.test(cleaned)) return "education";
  if (/experience|employment|work/.test(cleaned)) return "experience";
  if (/project/.test(cleaned)) return "projects";
  if (/skill|technolog/.test(cleaned)) return "skills";
  if (/summary|objective|profile|about/.test(cleaned)) return "summary";
  return "";
}

function parseEducation(content: string): ParsedEducation[] {
  return collectCommand(content, "resumeSubheading", 4).map((args) => {
    const [a, b, c, d] = args.map(latexToPlain);
    if (looksLikeDate(b) && !looksLikeDate(d)) {
      const { start, end } = splitDates(b);
      return { school: c, degree: a, location: d, start, end, details: "" };
    }
    const dateField = looksLikeDate(d) ? d : looksLikeDate(b) ? b : d;
    const location = looksLikeDate(d) ? b : d;
    const { start, end } = splitDates(dateField);
    return { school: a, degree: c, location, start, end, details: "" };
  });
}

function parseExperience(content: string): ParsedExperience[] {
  const roles: ParsedExperience[] = [];
  let index = 0;
  while (index < content.length) {
    const at = content.indexOf("\\resumeSubheading", index);
    if (at === -1) break;
    const args = readArgList(content, at + "\\resumeSubheading".length, 4);
    if (args.values.length < 4) {
      index = at + 17;
      continue;
    }
    const [a, b, c, d] = args.values.map(latexToPlain);
    const next = content.indexOf("\\resumeSubheading", args.end);
    const chunk = content.slice(args.end, next === -1 ? content.length : next);
    const bullets = collectCommand(chunk, "resumeItem", 1).map((item) =>
      latexToPlain(item[0]),
    );
    if (looksLikeDate(b)) {
      const { start, end } = splitDates(b);
      roles.push({ role: a, company: c, location: d, start, end, bullets });
    } else {
      const { start, end } = splitDates(d);
      roles.push({ role: c, company: a, location: b, start, end, bullets });
    }
    index = args.end;
  }
  return roles;
}

function parseProjects(content: string): ParsedProject[] {
  const projects: ParsedProject[] = [];
  let index = 0;
  while (index < content.length) {
    const at = content.indexOf("\\resumeProjectHeading", index);
    if (at === -1) break;
    const args = readArgList(content, at + "\\resumeProjectHeading".length, 3);
    if (args.values.length < 2) {
      index = at + 21;
      continue;
    }
    const rawName = args.values[0];
    const href = collectHrefs(rawName)[0];
    const name = latexToPlain(rawName);
    const { start, end } = splitDates(latexToPlain(args.values[1] ?? ""));
    const tech = latexToPlain((args.values[2] ?? "").replace(/\\textperiodcentered\{\}?/g, ","));
    const next = content.indexOf("\\resumeProjectHeading", args.end);
    const chunk = content.slice(args.end, next === -1 ? content.length : next);
    const bullets = collectCommand(chunk, "resumeItem", 1).map((item) =>
      latexToPlain(item[0]),
    );
    projects.push({
      name,
      tech: tech.replace(/\s*,\s*/g, ", "),
      link: href ? normalizeLinkUrl(href.url) : "",
      start,
      end,
      bullets,
    });
    index = args.end;
  }
  return projects;
}

function parseSkills(content: string): ParsedSkillGroup[] {
  const groups: ParsedSkillGroup[] = [];
  let index = 0;
  while (index < content.length) {
    const at = content.indexOf("\\textbf", index);
    if (at === -1) break;
    const title = readGroup(content, skipWs(content, at + 7));
    if (!title) {
      index = at + 7;
      continue;
    }
    const after = skipWs(content, title.end);
    let skillsRaw = "";
    let end = title.end;
    if (content[after] === "{") {
      const body = readGroup(content, after);
      skillsRaw = body?.value ?? "";
      end = body?.end ?? after;
    } else if (content[after] === ":") {
      const stop = nextIndex(content, after + 1, ["\\textbf", "\\\\"]);
      skillsRaw = content.slice(after + 1, stop);
      end = stop;
    } else {
      index = title.end;
      continue;
    }
    const label = latexToPlain(title.value);
    const skills = latexToPlain(skillsRaw.replace(/^[:\s]+/, ""))
      .split(/[,;]/)
      .map((skill) => skill.replace(/\s+/g, " ").trim())
      .filter((skill) => /^[\p{L}#.+]/u.test(skill) && skill.length < 60);
    if (label && skills.length) groups.push({ label, skills });
    index = end;
  }
  return groups;
}

function nextIndex(source: string, start: number, tokens: string[]): number {
  let best = source.length;
  for (const token of tokens) {
    const at = source.indexOf(token, start);
    if (at !== -1 && at < best) best = at;
  }
  return best;
}

function collectCommand(source: string, name: string, arity: number): string[][] {
  const found: string[][] = [];
  const token = `\\${name}`;
  let index = 0;
  while (index < source.length) {
    const at = source.indexOf(token, index);
    if (at === -1) break;
    const after = at + token.length;
    if (/\w/.test(source[after] ?? "")) {
      index = after;
      continue;
    }
    const args = readArgList(source, after, arity);
    if (args.values.length === arity) found.push(args.values);
    index = args.end;
  }
  return found;
}

function readArgList(
  source: string,
  start: number,
  max: number,
): { values: string[]; end: number } {
  const values: string[] = [];
  let index = start;
  for (let n = 0; n < max; n++) {
    const next = skipWs(source, index);
    if (source[next] !== "{") break;
    const group = readGroup(source, next);
    if (!group) break;
    values.push(group.value);
    index = group.end;
  }
  return { values, end: index };
}

function readGroup(
  source: string,
  openIndex: number,
): { value: string; end: number } | null {
  if (source[openIndex] !== "{") return null;
  let depth = 0;
  for (let i = openIndex; i < source.length; i++) {
    if (source[i] === "\\" && i + 1 < source.length) {
      i += 1;
      continue;
    }
    if (source[i] === "{") depth += 1;
    else if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        return { value: source.slice(openIndex + 1, i), end: i + 1 };
      }
    }
  }
  return null;
}

function skipWs(source: string, index: number): number {
  let i = index;
  while (i < source.length) {
    if (source[i] === "%" && source[i - 1] !== "\\") {
      while (i < source.length && source[i] !== "\n") i += 1;
      continue;
    }
    if (/\s/.test(source[i]!)) {
      i += 1;
      continue;
    }
    break;
  }
  return i;
}

export function latexToPlain(input: string): string {
  let i = 0;
  let out = "";
  const source = input.replace(/\$\|\$/g, "|").replace(/---/g, "—").replace(/--/g, "–");

  while (i < source.length) {
    if (source[i] === "%" && source[i - 1] !== "\\") {
      while (i < source.length && source[i] !== "\n") i += 1;
      continue;
    }
    if (source[i] === "\\") {
      const cmd = readCommand(source, i);
      if (cmd.name === "href") {
        const url = readGroup(source, skipWs(source, cmd.end));
        const text = url ? readGroup(source, skipWs(source, url.end)) : null;
        out += text ? latexToPlain(text.value) : "";
        i = text?.end ?? cmd.end;
        continue;
      }
      if (WRAPPERS.has(cmd.name)) {
        const group = readGroup(source, skipWs(source, cmd.end));
        out += group ? latexToPlain(group.value) : "";
        i = group?.end ?? cmd.end;
        continue;
      }
      if (cmd.name === "textperiodcentered") {
        out += ", ";
        i = eatOptionalEmpty(source, cmd.end);
        continue;
      }
      if (cmd.name === "textasciitilde") {
        out += "~";
        i = eatOptionalEmpty(source, cmd.end);
        continue;
      }
      if (cmd.name === "textasciicircum") {
        out += "^";
        i = eatOptionalEmpty(source, cmd.end);
        continue;
      }
      if (cmd.name === "textbackslash") {
        out += "\\";
        i = eatOptionalEmpty(source, cmd.end);
        continue;
      }
      if (SWITCHES.has(cmd.name) || cmd.name === "vspace" || cmd.name === "hspace") {
        if (cmd.name === "vspace" || cmd.name === "hspace") {
          const group = readGroup(source, skipWs(source, cmd.end));
          i = group?.end ?? cmd.end;
        } else {
          i = cmd.end;
        }
        continue;
      }
      if (cmd.name === "\\") {
        out += "\n";
        i = cmd.end;
        continue;
      }
      if (cmd.name === "" && source[cmd.end]) {
        out += source[cmd.end];
        i = cmd.end + 1;
        continue;
      }
      i = cmd.end;
      continue;
    }
    if (source[i] === "{" || source[i] === "}") {
      i += 1;
      continue;
    }
    out += source[i];
    i += 1;
  }

  return out.replace(/\s+/g, " ").trim();
}

function readCommand(
  source: string,
  index: number,
): { name: string; end: number } {
  if (source[index] !== "\\") return { name: "", end: index };
  const next = source[index + 1] ?? "";
  if (!/[A-Za-z]/.test(next)) {
    return { name: "", end: index + 1 };
  }
  let end = index + 1;
  while (end < source.length && /[A-Za-z]/.test(source[end]!)) end += 1;
  return { name: source.slice(index + 1, end), end };
}

function eatOptionalEmpty(source: string, index: number): number {
  const next = skipWs(source, index);
  if (source.startsWith("{}", next)) return next + 2;
  return index;
}

function looksLikeDate(value: string): boolean {
  return DATEISH.test(value);
}

function splitDates(value: string): { start: string; end: string } {
  const cleaned = value.replace(/\s+/g, " ").trim();
  const parts = cleaned.split(/\s+[–—-]+\s+|\s+to\s+/i);
  if (parts.length >= 2) {
    return { start: parts[0].trim(), end: parts.slice(1).join(" – ").trim() };
  }
  return { start: cleaned, end: "" };
}

function firstEmail(source: string): string {
  const match = source.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0] ?? "";
}

function firstPhone(source: string): string {
  const match = source.match(
    /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/,
  );
  if (!match) return "";
  const digits = match[0].replace(/\D/g, "");
  const local = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (local.length !== 10) return match[0].trim();
  return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
}
