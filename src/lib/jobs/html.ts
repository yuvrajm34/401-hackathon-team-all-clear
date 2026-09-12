/**
 * HTML to plain text, for job descriptions coming off external boards.
 *
 * Greenhouse double-encodes the `content` field: the markup arrives as the
 * literal characters `&lt;p&gt;` rather than `<p>`. So this decodes entities,
 * strips the tags that decoding revealed, then decodes a second time to catch
 * entities that were themselves encoded (`&amp;nbsp;` is everywhere in these
 * payloads). Output feeds `buildMatchReport`, so structure matters less than
 * getting every word through intact.
 */

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  lsquo: "\u2018",
  rsquo: "\u2019",
  ldquo: "\u201c",
  rdquo: "\u201d",
  hellip: "…",
  bull: "•",
  middot: "·",
  reg: "®",
  copy: "©",
  trade: "™",
  deg: "°",
};

/**
 * One left-to-right pass so `&amp;lt;` becomes `&lt;` rather than `<`. Running
 * separate replacements per entity would let the output of one feed the next
 * and fabricate tags that were never in the source.
 */
function decodeEntities(text: string): string {
  return text.replace(/&(#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/gi, (match, body: string) => {
    if (body.startsWith("#")) {
      const code = body[1] === "x" || body[1] === "X"
        ? Number.parseInt(body.slice(2), 16)
        : Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : match;
    }
    return ENTITIES[body.toLowerCase()] ?? match;
  });
}

function collapseWhitespace(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function htmlToText(raw: string): string {
  if (!raw) return "";

  let html = decodeEntities(raw);

  html = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ");
  // Keep the posting readable: paragraphs and list items become line breaks
  // instead of running every requirement into one wall of text.
  html = html.replace(/<br\s*\/?>/gi, "\n");
  html = html.replace(/<li\b[^>]*>/gi, "\n• ");
  html = html.replace(/<\/(p|div|h[1-6]|li|tr|ul|ol|section|article|blockquote)\s*>/gi, "\n");
  html = html.replace(/<[^>]*>/g, "");

  return collapseWhitespace(decodeEntities(html));
}

/** Cuts at a word boundary so the drawer never ends mid-word. */
export function truncateText(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > limit * 0.8 ? lastSpace : cut.length).trimEnd()}…`;
}
