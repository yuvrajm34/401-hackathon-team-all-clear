import { htmlToText } from "./html";

export type DescriptionBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

const HEADING_HINTS =
  /^(about|overview|what you.?ll|what you will|who you|responsibilit|requirement|qualification|nice to have|preferred|must have|benefit|perks|compensation|salary|location|how to apply|equal opportunity|who we are|what we|the role|the team|you will|you.?ll|minimum|preferred qualifications|basic qualifications|our stack|tech stack)\b/i;

function looksLikeHtml(raw: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(raw) || /&(?:lt|gt|amp|nbsp|#\d+);/i.test(raw);
}

function isHeading(line: string): boolean {
  const trimmed = line.replace(/[:：]\s*$/, "").trim();
  if (trimmed.length < 2 || trimmed.length > 64) return false;
  if (HEADING_HINTS.test(trimmed)) return true;
  if (/[:：]\s*$/.test(line) && trimmed.split(/\s+/).length <= 8) return true;
  if (trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed) && trimmed.split(/\s+/).length <= 8) {
    return true;
  }
  return false;
}

function bulletText(line: string): string | null {
  const match = line.match(/^(?:[-–—*•·]|[0-9]{1,2}[.)])\s+(.*)$/);
  return match?.[1]?.trim() ? match[1].trim() : null;
}

export function parseJobDescriptionBlocks(raw: string): DescriptionBlock[] {
  const text = looksLikeHtml(raw) ? htmlToText(raw) : raw.replace(/\r\n?/g, "\n").trim();
  if (!text) return [];

  const lines = text.split("\n").map((line) => line.trim());
  const blocks: DescriptionBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  };

  const flushList = () => {
    if (list.length === 0) return;
    blocks.push({ type: "list", items: list });
    list = [];
  };

  for (const line of lines) {
    if (!line) {
      flushList();
      flushParagraph();
      continue;
    }

    const item = bulletText(line);
    if (item) {
      flushParagraph();
      list.push(item);
      continue;
    }

    if (isHeading(line)) {
      flushList();
      flushParagraph();
      blocks.push({ type: "heading", text: line.replace(/[:：]\s*$/, "") });
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushList();
  flushParagraph();
  return blocks;
}
