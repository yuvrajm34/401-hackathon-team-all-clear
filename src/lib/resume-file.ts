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

/** Extracted text + hints the AI refine pass needs — kept so it can reuse
 * the already-extracted text instead of re-reading the file. Null for
 * LaTeX/already-structured input, which has nothing for the AI to improve. */
export interface ResumeRefineInput {
  text: string;
  links: ParsedLink[];
}

export interface ResumeFileQuickResult {
  parsed: ParsedResume;
  refineInput: ResumeRefineInput | null;
}

/**
 * Fast path: file → extracted text → regex/LaTeX heuristics. No AI call.
 * This is the whole reason it's split from the AI refine step: extraction
 * plus regex parsing resolves in well under a second, while a local LLM
 * pass over the same text takes 20-30+ seconds. Callers should show this
 * result immediately rather than blocking the UI on the slow path.
 */
export async function parseResumeFileQuick(
  file: File,
): Promise<ResumeFileQuickResult> {
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
      return {
        parsed: parseLatexResume(TEXT_DECODER.decode(bytes)),
        refineInput: null,
      };
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
      return { parsed: parseLatexResume(extracted.text), refineInput: null };
    }

    return {
      parsed: parseResumeText(extracted.text, { links: extracted.links }),
      refineInput: { text: extracted.text, links: extracted.links },
    };
  } catch (caught) {
    if (caught instanceof ResumeFileError) throw caught;
    if (caught instanceof Error && caught.name === "AbortError") {
      throw new ResumeFileError(
        "That took too long and was cancelled. Check the dev server is running and try again.",
      );
    }
    const message =
      caught instanceof Error && caught.message
        ? caught.message
        : "Could not read that file.";
    throw new ResumeFileError(message);
  }
}

/**
 * Slow path: asks the local Ollama model to re-parse the same extracted
 * text for a more accurate result (handles whatever sections the resume
 * actually has, instead of fixed regex patterns). Takes 20-30+ seconds on
 * modest hardware — always call this after already showing the quick
 * result, never in place of it.
 *
 * Returns null on any failure — no Ollama running, model not pulled, bad
 * JSON, network error, timeout — so the caller just keeps the quick result.
 * Silent by design: teammates without Ollama set up should see the same
 * heuristic-parser result as before, not an error.
 */
// Ceiling for the client-side fetch itself, independent of the server's own
// Ollama timeout — without this, a dead/hung dev server leaves the caller
// awaiting a fetch() that never settles, stuck with no way to recover short
// of a page refresh (this is exactly the "stuck on Parsing your resume"
// failure mode: the server died mid-request and nothing ever timed out).
const CLIENT_FETCH_TIMEOUT_MS = 185_000;

async function fetchWithTimeout(
  input: RequestInfo,
  init: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CLIENT_FETCH_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function refineResumeWithAI(
  input: ResumeRefineInput,
): Promise<ParsedResume | null> {
  try {
    const response = await fetchWithTimeout("/api/resume/parse-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: input.text, links: input.links }),
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

  const response = await fetchWithTimeout("/api/resume/extract", {
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
