/**
 * Binary extractors used by the /api/resume/extract route. These run on the
 * server because unpdf and mammoth both expect a Node-like environment —
 * importing them in the browser is what produced "Could not read that file"
 * for Word templates and many PDFs.
 */

import { sniffResumeKind, stripRtf, TEXT_DECODER } from "./resume-kind";
import { extractTexFromZip } from "./resume-zip";
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
    throw new Error(
      "Use a PDF, Word (.docx), Overleaf .tex, or paste the .tex source.",
    );
  }
  if (kind === "zip") {
    const tex = extractTexFromZip(bytes);
    if (!tex) {
      throw new Error(
        "That zip does not contain a .tex file. In Overleaf, open the resume .tex, Select All, copy, and paste it in the app.",
      );
    }
    return { text: tex, links: [] };
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
  const { extractLinks, extractTextItems } = await import("unpdf");

  // unpdf transfers the buffer into a worker, which detaches it — copy so
  // extractTextItems and extractLinks (running concurrently) each get
  // their own buffer instead of racing over the same one.
  const [{ items: pages }, { links: urls }] = await Promise.all([
    extractTextItems(bytes.slice()),
    extractLinks(bytes.slice()).catch(() => ({ links: [] as string[] })),
  ]);

  const hinted = urls
    .map((url): ParsedLink | null => {
      if (url.toLowerCase().startsWith("mailto:")) return null;
      const normalized = normalizeLinkUrl(url);
      if (!normalized) return null;
      const kind = classifyLink("", normalized);
      return { label: defaultLabelForKind(kind), url: normalized };
    })
    .filter((link): link is ParsedLink => link !== null);

  return { text: reconstructTextFromLayout(pages), links: hinted };
}

interface PositionedTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
}

/**
 * Rebuilds plain text from positioned PDF text items instead of using
 * unpdf/pdf.js's own text join, so blank lines between resume entries
 * (Education, Experience, Projects) survive extraction reliably.
 *
 * pdf.js's own line-joining is based on glyph-stream order and internal
 * heuristics, not visual layout — it frequently drops the blank line that
 * should separate two back-to-back entries with no heading between them,
 * which silently merges them into one and loses the second. Real vertical
 * whitespace between entries always exists in the PDF's actual coordinates
 * even when the text-join heuristic misses it, so this groups items into
 * visual lines by y-position, then inserts a blank line wherever the gap
 * to the next line is meaningfully larger than the page's typical
 * line-to-line spacing — a direct, format-agnostic signal for "new
 * paragraph/entry starts here" that works regardless of section wording.
 */
function reconstructTextFromLayout(pages: PositionedTextItem[][]): string {
  const pageTexts = pages.map((items) => reconstructPageText(items));
  return pageTexts.filter(Boolean).join("\n\n");
}

function reconstructPageText(items: PositionedTextItem[]): string {
  if (items.length === 0) return "";

  // Reading order: top of page first (larger PDF y = higher up), then
  // left-to-right within a line.
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);

  const LINE_Y_TOLERANCE = 2.5;
  const lines: { y: number; text: string }[] = [];
  let current: PositionedTextItem[] = [];
  let lastY: number | null = null;

  const flushLine = () => {
    if (current.length === 0) return;
    const sorted = [...current].sort((a, b) => a.x - b.x);
    let text = "";
    let prevEnd: number | null = null;
    for (const item of sorted) {
      // A gap between the end of the previous item and the start of this
      // one that's wider than typical inter-character spacing means these
      // are separate text runs (e.g. a left-aligned company name and a
      // right-aligned date on the same tab/column-based line) — pdf.js
      // doesn't insert a space there since there's no actual space glyph,
      // just a positioning jump. Without this, output reads
      // "Acme CorpJan 2024" instead of "Acme Corp Jan 2024".
      if (prevEnd !== null && item.x - prevEnd > item.fontSize * 0.3) {
        text += " ";
      }
      text += item.str;
      prevEnd = item.x + item.width;
    }
    text = text.trim();
    if (text) lines.push({ y: current[0].y, text });
    current = [];
  };

  for (const item of sorted) {
    if (!item.str.trim()) continue;
    if (lastY !== null && Math.abs(item.y - lastY) > LINE_Y_TOLERANCE) {
      flushLine();
    }
    current.push(item);
    lastY = item.y;
  }
  flushLine();

  if (lines.length === 0) return "";

  const gaps: number[] = [];
  for (let i = 1; i < lines.length; i++) {
    const gap = lines[i - 1].y - lines[i].y;
    if (gap > 0) gaps.push(gap);
  }
  const typicalGap = median(gaps) || 12;

  const rebuilt: string[] = [lines[0].text];
  for (let i = 1; i < lines.length; i++) {
    const gap = lines[i - 1].y - lines[i].y;
    // A gap noticeably bigger than normal single-line spacing means real
    // vertical whitespace in the PDF — a new paragraph/entry, not just the
    // next line of the same one.
    if (gap > typicalGap * 1.6) rebuilt.push("");
    rebuilt.push(lines[i].text);
  }
  return rebuilt.join("\n");
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
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
