import { contactItems, techSeparatorList } from "./resume-format";
import { dateRangeLabel, visibleResume } from "./resume";
import type { Resume } from "./types";

/**
 * Renders a resume to a self-contained LaTeX document that compiles on
 * Overleaf with no extra class files. The macro set follows the widely used
 * single-column engineering resume layout.
 */
export function resumeToLatex(resume: Resume): string {
  const visible = visibleResume(resume);
  const { profile } = resume;

  const sections: string[] = [];

  if (resume.summary.trim()) {
    sections.push(
      section(
        "Summary",
        `${escapeLatex(resume.summary.trim())}\n`,
      ),
    );
  }

  if (visible.education.length > 0) {
    const body = visible.education
      .map((item) => {
        const heading = subheading({
          left: escapeLatex(item.school),
          right: escapeLatex(item.location),
          leftSub: escapeLatex(item.degree),
          rightSub: escapeLatex(dateRangeLabel(item.start, item.end)),
        });
        const details = item.details.trim()
          ? `    \\resumeItemListStart\n      \\resumeItem{${escapeLatex(item.details.trim())}}\n    \\resumeItemListEnd\n`
          : "";
        return `${heading}${details}`;
      })
      .join("");

    sections.push(
      section("Education", `  \\resumeSubHeadingListStart\n${body}  \\resumeSubHeadingListEnd\n`),
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

    sections.push(
      section("Experience", `  \\resumeSubHeadingListStart\n${body}  \\resumeSubHeadingListEnd\n`),
    );
  }

  if (visible.projects.length > 0) {
    const body = visible.projects
      .map((item) => {
        const label = escapeLatex(item.name || stripProtocol(item.link));
        const name = item.link
          ? `\\href{${escapeUrl(withProtocol(item.link))}}{\\textbf{${label}}}`
          : `\\textbf{${label}}`;
        const heading = `    \\resumeProjectHeading{${name}}{${escapeLatex(
          dateRangeLabel(item.start, item.end),
        )}}\n`;
        const tech = item.tech
          ? `      \\vspace{-2pt}\\item[]\\small ${escapeLatex(techSeparatorList(item.tech))}\\vspace{-4pt}\n`
          : "";
        return `${heading}${tech}${bulletList(item.bullets.map((b) => b.text))}`;
      })
      .join("");

    sections.push(
      section("Projects", `  \\resumeSubHeadingListStart\n${body}  \\resumeSubHeadingListEnd\n`),
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

    sections.push(
      section(
        "Technical Skills",
        ` \\begin{itemize}[leftmargin=0.15in, label={}]\n    \\small{\\item{\n${rows}\n    }}\n \\end{itemize}\n`,
      ),
    );
  }

  return `${PREAMBLE}
\\begin{document}

\\begin{center}
    {\\LARGE \\textbf{${escapeLatex(profile.fullName || "Your Name")}}} \\\\ \\vspace{4pt}
    ${latexContactLine(profile)}
\\end{center}
${sections.join("\n")}
\\end{document}
`;
}

function latexContactLine(profile: Resume["profile"]): string {
  const parts = contactItems(profile).map((item) => {
    const label = escapeLatex(item.text);
    if (!item.href) return `\\small ${label}`;
    return `\\href{${escapeUrl(item.href)}}{\\underline{${label}}}`;
  });
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
  lines.push(contactItems(profile).map((item) => item.text).join(" | "));

  if (resume.summary.trim()) {
    lines.push("", "SUMMARY", resume.summary.trim());
  }

  if (visible.education.length > 0) {
    lines.push("", "EDUCATION");
    for (const item of visible.education) {
      lines.push(
        "",
        [item.school, item.location].filter(Boolean).join(" — "),
        [item.degree, dateRangeLabel(item.start, item.end)]
          .filter(Boolean)
          .join(" — "),
      );
      if (item.details) lines.push(item.details);
    }
  }

  if (visible.experience.length > 0) {
    lines.push("", "EXPERIENCE");
    for (const item of visible.experience) {
      lines.push(
        "",
        `${item.role} — ${item.company}${item.location ? `, ${item.location}` : ""}`,
      );
      const range = dateRangeLabel(item.start, item.end);
      if (range) lines.push(range);
      for (const b of item.bullets) lines.push(`- ${b.text}`);
    }
  }

  if (visible.projects.length > 0) {
    lines.push("", "PROJECTS");
    for (const item of visible.projects) {
      lines.push("", `${item.name}${item.tech ? ` (${item.tech})` : ""}`);
      if (item.link) lines.push(item.link);
      for (const b of item.bullets) lines.push(`- ${b.text}`);
    }
  }

  if (visible.skills.length > 0) {
    lines.push("", "SKILLS");
    for (const group of visible.skills) {
      lines.push(`${group.label}: ${group.skills.join(", ")}`);
    }
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
