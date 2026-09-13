/**
 * Pulls the main .tex out of an Overleaf "Download source" zip. Those archives
 * were previously sniffed as Word files because both formats start with PK.
 */

import { inflateRawSync } from "node:zlib";

const LOCAL_FILE = 0x04034b50;
const CENTRAL_DIR = 0x02014b50;

export function extractTexFromZip(bytes: Uint8Array): string | null {
  const files = readTexEntries(bytes);
  if (files.length === 0) return null;

  const ranked = [...files].sort((a, b) => scoreTex(b) - scoreTex(a));
  return ranked[0]?.content ?? null;
}

function scoreTex(file: { name: string; content: string }): number {
  const base = file.name.split("/").pop()?.toLowerCase() ?? "";
  let score = file.content.length;
  if (/(^|\/)(resume|cv|main)\.tex$/i.test(file.name)) score += 50_000;
  if (base === "resume.tex" || base === "cv.tex") score += 20_000;
  if (/\\resumeSubheading|\\resumeProjectHeading|\\section\s*\{/.test(file.content)) {
    score += 10_000;
  }
  return score;
}

function readTexEntries(bytes: Uint8Array): { name: string; content: string }[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const found: { name: string; content: string }[] = [];
  let offset = 0;

  while (offset + 30 <= bytes.length) {
    const signature = view.getUint32(offset, true);
    if (signature === CENTRAL_DIR) break;
    if (signature !== LOCAL_FILE) {
      offset += 1;
      continue;
    }

    const flags = view.getUint16(offset + 6, true);
    const method = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const nameEnd = nameStart + nameLength;
    if (nameEnd > bytes.length) break;

    const name = decodeAscii(bytes.subarray(nameStart, nameEnd));
    const dataStart = nameEnd + extraLength;
    if (flags & 0x8 || dataStart + compressedSize > bytes.length) {
      offset = dataStart;
      continue;
    }

    const next = dataStart + compressedSize;
    offset = next;

    if (!name || name.endsWith("/") || !name.toLowerCase().endsWith(".tex")) {
      continue;
    }

    const compressed = bytes.subarray(dataStart, next);
    let raw: Uint8Array;
    try {
      if (method === 0) raw = compressed;
      else if (method === 8) raw = inflateRawSync(compressed);
      else continue;
    } catch {
      continue;
    }

    const content = new TextDecoder("utf-8", { fatal: false }).decode(raw);
    if (content.trim()) found.push({ name, content });
  }

  return found;
}

function decodeAscii(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
}
