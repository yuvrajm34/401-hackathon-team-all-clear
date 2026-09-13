/**
 * Compares a resume against a job description and asks a local Ollama
 * model for concrete edits to make before applying — genuine, specific
 * suggestions instead of a naive keyword-frequency diff (which used to
 * surface generic posting language as "missing skills" to bolt onto the
 * resume verbatim).
 *
 * Streams the model's output line by line rather than waiting for the full
 * generation to finish, so the first suggestion shows up in a couple of
 * seconds instead of the UI sitting on a spinner for the entire 10-20+
 * second pass — see `ollamaStreamLines` in lib/ollama.ts.
 */
import { ollamaStreamLines, OllamaError } from "@/lib/ollama";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are a resume tailoring assistant comparing a resume against a job description.

Output ONE suggestion per line and nothing else — no numbering, no markdown, no preamble, no closing remarks. Every line must start with exactly one of these two tags:
REFRAME: <suggestion>
GAP: <suggestion>

Rules:
- REFRAME points at something already on the resume and says how to present it better for this posting, e.g. "REFRAME: Lead the ApplyPath bullet with the outcome ('used by 6 people') instead of the task." or "REFRAME: Emphasize the REST API work in the Weather Dashboard project — the posting highlights API design and this project already does it."
- GAP flags a posting requirement the resume never mentions. Phrase it as a flag to the candidate, never as an instruction to fabricate: "GAP: The posting asks for Docker experience, which isn't in the resume. Only add it if you've actually used Docker — don't invent it."
- Never suggest adding any tool, metric, or claim the resume doesn't already support, even indirectly. Reframing existing content is always safe; a gap is only ever a flag, never an instruction to add something new.
- Reference actual resume content and actual posting requirements — no generic advice like "tailor your resume" or "use keywords."
- At most 8 lines total, most impactful first. If the resume already covers the posting well, output fewer lines, or none at all.`;

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

  const prompt = [
    "RESUME:",
    resumeText.slice(0, 6_000),
    "",
    "JOB DESCRIPTION:",
    jobDescription.slice(0, 4_000),
  ].join("\n");

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const line of ollamaStreamLines({
          system: SYSTEM_PROMPT,
          prompt,
          numPredict: 500,
        })) {
          const tagged = line.match(/^(REFRAME|GAP):\s*(.+)$/i);
          const text = (tagged?.[2] ?? line).trim();
          if (!text) continue;
          controller.enqueue(encoder.encode(`${text}\n`));
        }
      } catch (caught) {
        const message =
          caught instanceof OllamaError
            ? caught.message
            : "Could not generate suggestions.";
        // No headers/status left to set once the stream has started — the
        // client recognizes this sentinel line and surfaces it as an error
        // instead of a suggestion.
        controller.enqueue(encoder.encode(`__ERROR__:${message}\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
