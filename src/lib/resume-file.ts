/**
 * Pulls plain text (and labeled hyperlinks) out of an uploaded resume.
 * Runs in the browser so the file never leaves the machine.
 */

import {
  classifyLink,
  defaultLabelForKind,
  normalizeLinkUrl,
  parseResumeText,
  type ParsedLink,
  type ParsedResume,
} from "./resume-parse";

export const RESUME_ACCEPT =
  ".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown";

const MAX_BYTES = 8 * 1024 * 1024;

export class ResumeFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResumeFileError";
  }
}

export async function parseResumeFile(file: File): Promise<ParsedResume> {
  if (file.size === 0) {
    throw new ResumeFileError("That file is empty.");
  }
  if (file.size > MAX_BYTES) {
    throw new ResumeFileError("Keep the file under 8 MB.");
  }

  const name = file.name.toLowerCase();
  if (name.endsWith(".doc") && !name.endsWith(".docx")) {
    throw new ResumeFileError("Save the Word file as .docx or export a PDF.");
  }

  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    return parsePdfResume(await file.arrayBuffer());
  }

  if (
    name.endsWith(".docx") ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return parseDocxResume(await file.arrayBuffer());
  }

  const text = await file.text();
  return parseResumeText(text);
}

async function parsePdfResume(buffer: ArrayBuffer): Promise<ParsedResume> {
  const { extractLinks, extractText } = await import("unpdf");
  const data = new Uint8Array(buffer);

  const [{ text }, { links }] = await Promise.all([
    extractText(data, { mergePages: true }),
    extractLinks(data),
  ]);

  const hinted = links
    .map((url): ParsedLink | null => {
      const normalized = normalizeLinkUrl(url);
      if (!normalized) return null;
      const kind = classifyLink("", normalized);
      return { label: defaultLabelForKind(kind), url: normalized };
    })
    .filter((link): link is ParsedLink => link !== null);

  return parseResumeText(text, { links: hinted });
}

async function parseDocxResume(buffer: ArrayBuffer): Promise<ParsedResume> {
  const mammoth = await import("mammoth");
  const [raw, html] = await Promise.all([
    mammoth.extractRawText({ arrayBuffer: buffer }),
    mammoth.convertToHtml({ arrayBuffer: buffer }),
  ]);

  return parseResumeText(raw.value, { links: linksFromHtml(html.value) });
}

/** `<a href="…">LinkedIn</a>` keeps the written name with the URL. */
function linksFromHtml(html: string): ParsedLink[] {
  const found: ParsedLink[] = [];
  const anchor = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchor)) {
    const url = normalizeLinkUrl(decodeHtml(match[1]));
    if (!url) continue;
    const label = decodeHtml(match[2].replace(/<[^>]+>/g, "")).trim();
    found.push({ label, url });
  }
  return found;
}

function decodeHtml(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
