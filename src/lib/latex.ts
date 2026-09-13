import { dateRangeLabel, getSectionOrder, visibleResume } from "./resume";
import type { ProfileLink, Resume, ResumeSectionKey } from "./types";

/**
 * Renders a resume to a self-contained LaTeX document that compiles on
 * Overleaf with no extra class files. The macro set follows the widely used
 * single-column engineering resume layout.
 */
export function resumeToLatex(resume: Resume): string {
  const visible = visibleResume(resume);
  const { profile } = resume;

  const bySection: Partial<Record<ResumeSectionKey, string>> = {};

  if (resume.summary.trim()) {
    bySection.summary = section(
      "Summary",
      `${escapeLatex(resume.summary.trim())}\n`,
    );
  }

  if (visible.education.length > 0) {
    const body = visible.education
      .map((item) => {
        const heading = subheading({
          left: escapeLatex(item.school),
          right: escapeLatex(dateRangeLabel(item.start, item.end)),
          leftSub: escapeLatex(item.degree),
          rightSub: escapeLatex(item.location),
        });
        const details = item.details.trim()
          ? `    \\resumeItemListStart\n      \\resumeItem{${escapeLatex(item.details.trim())}}\n    \\resumeItemListEnd\n`
          : "";
        return `${heading}${details}`;
      })
      .join("");

    bySection.education = section(
      "Education",
      `  \\resumeSubHeadingListStart\n${body}  \\resumeSubHeadingListEnd\n`,
    );
  }

  if (visible.experience.length > 0) {
    const body = visible.experience
      .map((item) => {
        const heading = subheading({
          left: escapeLatex(item.role),
          right: escapeLatex(dateRangeLabel(item.start, item.end)),
          leftSub: escapeLatex(item.company),
          rightSub: escapeLatex(item.location),
        });
        return `${heading}${bulletList(item.bullets.map((b) => b.text))}`;
      })
      .join("");

    bySection.experience = section(
      "Experience",
      `  \\resumeSubHeadingListStart\n${body}  \\resumeSubHeadingListEnd\n`,
    );
  }

  if (visible.projects.length > 0) {
    const body = visible.projects
      .map((item) => {
        const label = escapeLatex(item.name || stripProtocol(item.link));
        const name = item.link
          ? `\\href{${escapeUrl(withProtocol(item.link))}}{\\underline{${label}}}`
          : label;
        const title = item.tech
          ? `\\textbf{${name}} $|$ \\emph{${escapeLatex(item.tech)}}`
          : `\\textbf{${name}}`;

        const heading = `    \\resumeProjectHeading{${title}}{${escapeLatex(
          dateRangeLabel(item.start, item.end),
        )}}\n`;
        return `${heading}${bulletList(item.bullets.map((b) => b.text))}`;
      })
      .join("");

    bySection.projects = section(
      "Projects",
      `  \\resumeSubHeadingListStart\n${body}  \\resumeSubHeadingListEnd\n`,
    );
  }

  if (visible.skills.length > 0) {
    const rows = visible.skills
      .map(
        (group) =>
          `     \\textbf{${escapeLatex(group.label)}}{: ${escapeLatex(
            group.skills.join(", "),
          )}}`,
      )
      .join(" \\\\\n");

    bySection.skills = section(
      "Technical Skills",
      ` \\begin{itemize}[leftmargin=0.15in, label={}]\n    \\small{\\item{\n${rows}\n    }}\n \\end{itemize}\n`,
    );
  }

  const sections = getSectionOrder(resume)
    .map((key) => bySection[key])
    .filter((value): value is string => Boolean(value));

  return `${PREAMBLE}
\\begin{document}

\\begin{center}
    {\\Huge \\scshape ${escapeLatex(profile.fullName || "Your Name")}} \\\\ \\vspace{3pt}
    ${contactLine(profile.phone, profile.email, profile.location, profile.links)}
\\end{center}
${profile.headline.trim() ? `\n\\vspace{2pt}\n\\begin{center}\n    \\small ${escapeLatex(profile.headline.trim())}\n\\end{center}\n` : ""}
${sections.join("\n")}
\\end{document}
`;
}

function contactLine(
  phone: string,
  email: string,
  location: string,
  links: ProfileLink[],
): string {
  const parts: string[] = [];

  if (phone) parts.push(`\\small ${escapeLatex(phone)}`);
  if (email) {
    parts.push(
      `\\href{mailto:${escapeUrl(email)}}{\\underline{${escapeLatex(email)}}}`,
    );
  }
  if (location) parts.push(escapeLatex(location));

  for (const link of links) {
    if (!link.url.trim()) continue;
    parts.push(
      `\\href{${escapeUrl(withProtocol(link.url))}}{\\underline{${escapeLatex(
        stripProtocol(link.url),
      )}}}`,
    );
  }

  return parts.length > 0 ? parts.join(" $|$ ") : "\\small";
}

function section(title: string, body: string): string {
  return `\\section{${escapeLatex(title)}}\n${body}`;
}

function subheading(parts: {
  left: string;
  right: string;
  leftSub: string;
  rightSub: string;
}): string {
  return `    \\resumeSubheading\n      {${parts.left}}{${parts.right}}\n      {${parts.leftSub}}{${parts.rightSub}}\n`;
}

function bulletList(texts: string[]): string {
  const items = texts.filter((text) => text.trim());
  if (items.length === 0) return "";
  const rendered = items
    .map((text) => `        \\resumeItem{${escapeLatex(text.trim())}}`)
    .join("\n");
  return `      \\resumeItemListStart\n${rendered}\n      \\resumeItemListEnd\n`;
}

const LATEX_ESCAPES: Record<string, string> = {
  "\\": "\\textbackslash{}",
  "&": "\\&",
  "%": "\\%",
  $: "\\$",
  "#": "\\#",
  _: "\\_",
  "{": "\\{",
  "}": "\\}",
  "~": "\\textasciitilde{}",
  "^": "\\textasciicircum{}",
};

/**
 * Escapes the characters that are special in LaTeX text mode.
 *
 * Done in a single pass: escaping the backslash on its own first would emit
 * `\textbackslash{}`, whose braces a second pass would then escape again.
 * Smart punctuation is normalised beforehand since it introduces no specials.
 */
export function escapeLatex(input: string): string {
  return input
    .replace(/[\u2013\u2014]/g, "--")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2022/g, "-")
    .replace(/[\\&%$#_{}~^]/g, (character) => LATEX_ESCAPES[character]);
}

/**
 * `hyperref` targets must stay literal, so only the characters that would
 * break the surrounding document are guarded.
 */
function escapeUrl(input: string): string {
  return input.trim().replace(/([%#&])/g, "\\$1");
}

function withProtocol(url: string): string {
  if (/^https?:\/\//i.test(url) || url.startsWith("mailto:")) return url;
  return `https://${url}`;
}

function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

/** Plain text version, handy for pasting into application portals. */
export function resumeToPlainText(resume: Resume): string {
  const visible = visibleResume(resume);
  const { profile } = resume;
  const lines: string[] = [];

  lines.push(profile.fullName || "Your Name");
  if (profile.headline) lines.push(profile.headline);
  lines.push(
    [
      profile.email,
      profile.phone,
      profile.location,
      ...profile.links.filter((l) => l.url).map((l) => l.url),
    ]
      .filter(Boolean)
      .join(" | "),
  );

  const bySection: Partial<Record<ResumeSectionKey, string[]>> = {};

  if (resume.summary.trim()) {
    bySection.summary = ["", "SUMMARY", resume.summary.trim()];
  }

  if (visible.experience.length > 0) {
    const section: string[] = ["", "EXPERIENCE"];
    for (const item of visible.experience) {
      section.push(
        "",
        `${item.role} — ${item.company}${item.location ? `, ${item.location}` : ""}`,
      );
      const range = dateRangeLabel(item.start, item.end);
      if (range) section.push(range);
      for (const b of item.bullets) section.push(`- ${b.text}`);
    }
    bySection.experience = section;
  }

  if (visible.projects.length > 0) {
    const section: string[] = ["", "PROJECTS"];
    for (const item of visible.projects) {
      section.push("", `${item.name}${item.tech ? ` (${item.tech})` : ""}`);
      if (item.link) section.push(item.link);
      for (const b of item.bullets) section.push(`- ${b.text}`);
    }
    bySection.projects = section;
  }

  if (visible.education.length > 0) {
    const section: string[] = ["", "EDUCATION"];
    for (const item of visible.education) {
      section.push("", `${item.degree} — ${item.school}`);
      const range = dateRangeLabel(item.start, item.end);
      if (range) section.push(range);
      if (item.details) section.push(item.details);
    }
    bySection.education = section;
  }

  if (visible.skills.length > 0) {
    const section: string[] = ["", "SKILLS"];
    for (const group of visible.skills) {
      section.push(`${group.label}: ${group.skills.join(", ")}`);
    }
    bySection.skills = section;
  }

  for (const key of getSectionOrder(resume)) {
    const section = bySection[key];
    if (section) lines.push(...section);
  }

  return lines.join("\n");
}

const PREAMBLE = `%-------------------------------------------------------------------------------
% Generated by ApplyPath. Paste into Overleaf and compile with pdfLaTeX.
%-------------------------------------------------------------------------------
\\documentclass[letterpaper,11pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\input{glyphtounicode}

\\pagestyle{fancy}
\\fancyhf{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

\\pdfgentounicode=1

\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-2pt}}
  }
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\small#1 & #2 \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}

\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}
%-------------------------------------------------------------------------------
`;
