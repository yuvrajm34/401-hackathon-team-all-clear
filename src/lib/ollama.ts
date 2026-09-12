/**
 * Thin client for a local Ollama server. Used to parse resumes into
 * flexible structured fields and to compare a resume against a job
 * description — both server-side only (Route Handlers), since Ollama is a
 * local HTTP server (default http://localhost:11434) and calling it from
 * the browser would hit CORS and expose the host to the client.
 *
 * Ollama is optional: whoever is running `next dev` needs it installed and
 * running with the model pulled. Callers should always have a non-AI
 * fallback for teammates who don't have it set up.
 */

const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://localhost:11434";
// gemma3 (4.3B) generates roughly 3x faster than llama3.1:8b on the same
// hardware — measured ~64 tok/s vs ~21 tok/s warm, since decode speed on a
// local GPU scales with parameter count (it's memory-bandwidth bound:
// smaller model = fewer weights to stream per token). Quality on resume
// parsing was comparable in testing; set OLLAMA_MODEL=llama3.1:8b if you
// hit worse results on an unusual resume format.
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "gemma3:latest";

/**
 * Local inference speed varies wildly by hardware — CPU-only 8B inference
 * can run well under 10 tokens/sec, and a full structured resume response
 * needs several hundred output tokens. Generous ceiling so a slow machine
 * still completes instead of always falling back.
 */
const REQUEST_TIMEOUT_MS = 180_000;

export class OllamaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OllamaError";
  }
}

/**
 * Sends a chat completion request constrained to JSON output.
 * Throws `OllamaError` with a message safe to show the user (never a raw
 * network error) on any failure — unreachable server, timeout, or a
 * response that isn't valid JSON.
 */
export async function ollamaJson<T>(params: {
  system: string;
  prompt: string;
}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        format: "json",
        options: { temperature: 0.2 },
        messages: [
          { role: "system", content: params.system },
          { role: "user", content: params.prompt },
        ],
      }),
    });
  } catch (caught) {
    if (caught instanceof Error && caught.name === "AbortError") {
      throw new OllamaError(
        `${OLLAMA_MODEL} took too long to respond. It may still be loading — try again in a moment.`,
      );
    }
    throw new OllamaError(
      `Could not reach Ollama at ${OLLAMA_HOST}. Make sure "ollama serve" is running and ${OLLAMA_MODEL} is pulled.`,
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    if (response.status === 404) {
      throw new OllamaError(
        `Model "${OLLAMA_MODEL}" isn't pulled. Run "ollama pull ${OLLAMA_MODEL}".`,
      );
    }
    throw new OllamaError(`Ollama returned an error: ${body || response.statusText}`);
  }

  const payload = (await response.json()) as { message?: { content?: string } };
  const content = payload.message?.content;
  if (!content) {
    throw new OllamaError("Ollama returned an empty response.");
  }

  try {
    return JSON.parse(content) as T;
  } catch {
    throw new OllamaError("Ollama did not return valid JSON.");
  }
}
