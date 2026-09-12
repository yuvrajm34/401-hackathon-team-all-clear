/**
 * Binary extractors used by the /api/resume/extract route. These run on the
 * server because unpdf and mammoth both expect a Node-like environment —
 * importing them in the browser is what produced "Could not read that file"
 * for Word templates and many PDFs.
 */

import { sniffResumeKind, stripRtf, TEXT_DECODER } from "./resume-kind";
import {
  classifyLink,
  defaultLabelForKind,
  normalizeLinkUrl,
  type ParsedLink,
} from "./resume-parse";

export async function extractResumeFromBytes(
  name: string,
  bytes: Uint8Array,
): Promise<{ text: string; links: ParsedLink[] }> {
  const kind = sniffResumeKind(name, bytes);

  if (kind === "doc") {
    throw new Error("Save the old .doc file as .docx or export a PDF.");
  }
  if (kind === "unknown") {
    throw new Error("Use a PDF, Word (.docx or .dotx), or a .txt file.");
  }
  if (kind === "text" || kind === "tex") {
    return { text: TEXT_DECODER.decode(bytes), links: [] };
  }
  if (kind === "rtf") {
    return { text: stripRtf(TEXT_DECODER.decode(bytes)), links: [] };
  }
  if (kind === "pdf") {
    return extractPdf(bytes);
  }
  return extractDocx(bytes);
}

async function extractPdf(
  bytes: Uint8Array,
): Promise<{ text: string; links: ParsedLink[] }> {
  const { extractLinks, extractText } = await import("unpdf");

  const [{ text }, { links }] = await Promise.all([
    extractText(bytes, { mergePages: true }),
    extractLinks(bytes).catch(() => ({ links: [] as string[] })),
  ]);

  const hinted = links
    .map((url): ParsedLink | null => {
      const normalized = normalizeLinkUrl(url);
      if (!normalized) return null;
      const kind = classifyLink("", normalized);
      return { label: defaultLabelForKind(kind), url: normalized };
    })
    .filter((link): link is ParsedLink => link !== null);

  return { text, links: hinted };
}

async function extractDocx(
  bytes: Uint8Array,
): Promise<{ text: string; links: ParsedLink[] }> {
  const mammoth = await import("mammoth");
  // This mammoth build only accepts `path` / `buffer` / `file` — not
  // `arrayBuffer`. Passing the wrong key is what made Word templates fail.
  const buffer = Buffer.from(bytes);

  const [raw, html] = await Promise.all([
    mammoth.extractRawText({ buffer }),
    mammoth.convertToHtml({ buffer }),
  ]);

  return { text: raw.value, links: linksFromHtml(html.value) };
}

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
