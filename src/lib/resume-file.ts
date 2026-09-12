/**
 * Turns an uploaded resume into structured fields.
 *
 * Plain text is read here. PDF and Word (including .dotx templates) go
 * through `/api/resume/extract` so unpdf/mammoth run in Node instead of
 * the browser — the browser import is what failed on typical templates.
 */

import { looksLikeLatexResume, parseLatexResume } from "./resume-latex";
import { sniffResumeKind, stripRtf, TEXT_DECODER } from "./resume-kind";
import { parseResumeText, type ParsedResume } from "./resume-parse";

export const RESUME_ACCEPT =
  ".pdf,.docx,.dotx,.docm,.tex,.zip,.txt,.md,.rtf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.wordprocessingml.template,application/x-tex,text/x-tex,application/zip,text/plain,text/markdown,application/rtf";

const MAX_BYTES = 8 * 1024 * 1024;

export class ResumeFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResumeFileError";
  }
}

/** Shared by file upload and the Overleaf paste box. */
export function parseResumeSource(
  source: string,
  links: { label: string; url: string }[] = [],
): ParsedResume {
  const text = source.replace(/^\uFEFF/, "");
  if (!text.trim()) {
    throw new ResumeFileError("Paste the Overleaf .tex first.");
  }

  try {
    return looksLikeLatexResume(text)
      ? parseLatexResume(text)
      : parseResumeText(text, { links });
  } catch (caught) {
    if (caught instanceof ResumeFileError) throw caught;
    throw new ResumeFileError(
      "Could not read that Overleaf source. Copy the full .tex (from \\documentclass through \\end{document}).",
    );
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
      "Use a PDF, Word (.docx), Overleaf .tex, or paste the .tex source.",
    );
  }

  try {
    if (kind === "tex") {
      return parseResumeSource(TEXT_DECODER.decode(bytes));
    }

    const extracted =
      kind === "pdf" || kind === "docx" || kind === "zip"
        ? await extractOnServer(file)
        : {
            text:
              kind === "rtf"
                ? stripRtf(TEXT_DECODER.decode(bytes))
                : TEXT_DECODER.decode(bytes),
            links: [],
          };

    return parseResumeSource(extracted.text, extracted.links);
  } catch (caught) {
    if (caught instanceof ResumeFileError) throw caught;
    const message =
      caught instanceof Error && caught.message
        ? caught.message
        : "Could not read that file.";
    throw new ResumeFileError(message);
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
