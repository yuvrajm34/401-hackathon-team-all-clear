/**
 * Turns an uploaded resume into structured fields.
 *
 * Plain text is read here. PDF and Word (including .dotx templates) go
 * through `/api/resume/extract` so unpdf/mammoth run in Node instead of
 * the browser — the browser import is what failed on typical templates.
 */

import { looksLikeLatexResume, parseLatexResume } from "./resume-latex";
import { sniffResumeKind, stripRtf, TEXT_DECODER } from "./resume-kind";
import {
  parseResumeText,
  type ParsedLink,
  type ParsedResume,
} from "./resume-parse";

export const RESUME_ACCEPT =
  ".pdf,.docx,.dotx,.docm,.tex,.txt,.md,.rtf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.wordprocessingml.template,application/x-tex,text/x-tex,text/plain,text/markdown,application/rtf";

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

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffResumeKind(file.name, bytes);

  if (kind === "doc") {
    throw new ResumeFileError(
      "Save the old .doc file as .docx or export a PDF.",
    );
  }
  if (kind === "unknown") {
    throw new ResumeFileError(
      "Use a PDF, Word (.docx or .dotx), Overleaf .tex, or a .txt file.",
    );
  }

  try {
    if (kind === "tex") {
      return parseLatexResume(TEXT_DECODER.decode(bytes));
    }

    const extracted =
      kind === "pdf" || kind === "docx"
        ? await extractOnServer(file)
        : {
            text:
              kind === "rtf"
                ? stripRtf(TEXT_DECODER.decode(bytes))
                : TEXT_DECODER.decode(bytes),
            links: [],
          };

    if (looksLikeLatexResume(extracted.text)) {
      return parseLatexResume(extracted.text);
    }

    const aiParsed = await tryAIParse(extracted.text, extracted.links);
    if (aiParsed) return aiParsed;

    return parseResumeText(extracted.text, { links: extracted.links });
  } catch (caught) {
    if (caught instanceof ResumeFileError) throw caught;
    const message =
      caught instanceof Error && caught.message
        ? caught.message
        : "Could not read that file.";
    throw new ResumeFileError(message);
  }
}

/**
 * Best-effort AI parse via a local Ollama model (see /api/resume/parse-ai).
 * Returns null on any failure — no Ollama running, model not pulled, bad
 * JSON, network error — so the caller falls back to the regex heuristics.
 * Silent by design: teammates without Ollama set up should see the same
 * heuristic-parser behavior as before, not an error.
 */
async function tryAIParse(
  text: string,
  links: ParsedLink[],
): Promise<ParsedResume | null> {
  try {
    const response = await fetch("/api/resume/parse-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, links }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (payload?.error) console.warn("AI resume parse skipped:", payload.error);
      return null;
    }
    const payload = (await response.json()) as { parsed?: ParsedResume };
    return payload.parsed ?? null;
  } catch {
    return null;
  }
}

async function extractOnServer(
  file: File,
): Promise<{ text: string; links: { label: string; url: string }[] }> {
  const body = new FormData();
  body.append("file", file);

  const response = await fetch("/api/resume/extract", {
    method: "POST",
    body,
  });

  const payload = (await response.json().catch(() => null)) as
    | { text?: string; links?: { label: string; url: string }[]; error?: string }
    | null;

  if (!response.ok) {
    throw new ResumeFileError(
      payload?.error ||
        "Could not read that file. Try a .docx or a text-based PDF.",
    );
  }

  return {
    text: payload?.text ?? "",
    links: payload?.links ?? [],
  };
}
