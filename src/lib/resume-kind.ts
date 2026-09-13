export type ResumeKind =
  | "pdf"
  | "docx"
  | "zip"
  | "rtf"
  | "tex"
  | "text"
  | "doc"
  | "unknown";

export function sniffResumeKind(name: string, bytes: Uint8Array): ResumeKind {
  const lower = name.toLowerCase();
  const header = String.fromCharCode(...bytes.slice(0, 8));

  if (header.startsWith("%PDF") || lower.endsWith(".pdf")) return "pdf";
  if (header.startsWith("{\\rtf") || lower.endsWith(".rtf")) return "rtf";

  if (
    (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11) ||
    (lower.endsWith(".doc") && !lower.endsWith(".docx") && !lower.endsWith(".dotx"))
  ) {
    return "doc";
  }

  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (
    isZip ||
    lower.endsWith(".docx") ||
    lower.endsWith(".dotx") ||
    lower.endsWith(".docm") ||
    lower.endsWith(".zip")
  ) {
    if (isZip && !zipPeekLooksLikeDocx(bytes)) return "zip";
    return "docx";
  }

  const sample = TEXT_DECODER.decode(bytes.slice(0, 4000));
  if (
    lower.endsWith(".tex") ||
    /\\documentclass/.test(sample) ||
    /\\resumeSubheading/.test(sample) ||
    /\\begin\{document\}/.test(sample)
  ) {
    return "tex";
  }

  if (lower.endsWith(".txt") || lower.endsWith(".md") || looksLikeText(bytes)) {
    return "text";
  }

  return "unknown";
}

export function stripRtf(input: string): string {
  return input
    .replace(/\\'[0-9a-fA-F]{2}/g, " ")
    .replace(/\\[a-zA-Z]+\d* ?/g, " ")
    .replace(/[{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function looksLikeText(bytes: Uint8Array): boolean {
  const sample = bytes.slice(0, 512);
  if (sample.length === 0) return false;
  let weird = 0;
  for (const byte of sample) {
    if (byte === 0) return false;
    if (byte < 9 || (byte > 13 && byte < 32)) weird += 1;
  }
  return weird / sample.length < 0.1;
}

export const TEXT_DECODER = new TextDecoder();

/** Word files are zips that contain `[Content_Types].xml`. Overleaf source is not. */
function zipPeekLooksLikeDocx(bytes: Uint8Array): boolean {
  const peek = TEXT_DECODER.decode(bytes.subarray(0, 8192));
  return /\[Content_Types\]\.xml|word\/document\.xml/.test(peek);
}
