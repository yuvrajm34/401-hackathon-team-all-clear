/**
 * Compares a resume against a job description and asks a local Ollama
 * model for concrete edits to make before applying. Complements the
 * keyword-match panel (which just flags missing terms) with actual
 * rewrite/emphasis suggestions.
 */
import { ollamaJson, OllamaError } from "@/lib/ollama";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are a resume tailoring assistant. Compare the resume text against the job description and return ONLY a JSON object of this shape, no commentary:

{ "suggestions": string[] }

Rules:
- Each suggestion is one concrete, actionable edit — not general advice. Reference the actual resume content and actual posting requirements.
- There are two kinds of suggestions — phrase each one so it's unmistakable which kind it is:
  1. Reframing something that's already there, e.g. "Rewrite the ApplyPath bullet to lead with the outcome ('used by 6 people') instead of the task", or "Emphasize the REST API work in the Weather Dashboard project — the posting highlights API design and this project already does it."
  2. Flagging a gap — a posting requirement the resume never mentions. Phrase these as a flag to the candidate, NOT as an instruction to add a bullet: "Gap: the posting asks for Docker experience, which isn't in the resume. Only add it if you've actually used Docker — don't fabricate it." Never phrase a gap as "Add a bullet about X" — that reads as an instruction to invent experience.
- Never suggest adding any tool, metric, or claim the resume doesn't already support, even indirectly. Reframing existing content is always safe; filling a gap is only ever a flag, never an instruction to add something new.
- Return at most 8 suggestions, ordered by impact.
- If the resume already covers the posting well, it's fine to return fewer suggestions, or an empty array.`;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    resumeText?: string;
    jobDescription?: string;
  } | null;

  const resumeText = body?.resumeText?.trim();
  const jobDescription = body?.jobDescription?.trim();

  if (!resumeText || !jobDescription) {
    return Response.json(
      { error: "Need both a resume and a job description to compare." },
      { status: 400 },
    );
  }

  try {
    const result = await ollamaJson<{ suggestions?: unknown }>({
      system: SYSTEM_PROMPT,
      prompt: [
        "RESUME:",
        resumeText.slice(0, 8_000),
        "",
        "JOB DESCRIPTION:",
        jobDescription.slice(0, 6_000),
      ].join("\n"),
    });

    const suggestions = Array.isArray(result.suggestions)
      ? result.suggestions.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      : [];

    return Response.json({ suggestions });
  } catch (caught) {
    const message =
      caught instanceof OllamaError ? caught.message : "Could not generate suggestions.";
    return Response.json({ error: message }, { status: 502 });
  }
}
