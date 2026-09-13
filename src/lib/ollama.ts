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

/**
 * Streams a chat completion and yields each complete line of the model's
 * output as soon as it's flushed, instead of waiting for the whole
 * generation to finish. A resume-tailoring pass can take 10-20+ seconds
 * end to end on modest hardware; with `format: "json"` (used by
 * `ollamaJson`) nothing can be shown until the very last token closes the
 * JSON, so the UI just sits on a spinner the entire time. Streaming plain
 * lines instead lets the first suggestion render in a couple of seconds and
 * the rest trickle in — the same total generation time, but usable much
 * sooner. Requires the system prompt to ask for one self-contained unit of
 * output per line (no multi-line JSON), since that's the unit this yields.
 */
export async function* ollamaStreamLines(params: {
  system: string;
  prompt: string;
  /** Caps generation length so a run-on response can't stall the request
   * far past what a handful of short suggestions should ever need. */
  numPredict?: number;
}): AsyncGenerator<string> {
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
        stream: true,
        options: {
          temperature: 0.2,
          ...(params.numPredict ? { num_predict: params.numPredict } : {}),
        },
        messages: [
          { role: "system", content: params.system },
          { role: "user", content: params.prompt },
        ],
      }),
    });
  } catch (caught) {
    clearTimeout(timeout);
    if (caught instanceof Error && caught.name === "AbortError") {
      throw new OllamaError(
        `${OLLAMA_MODEL} took too long to respond. It may still be loading — try again in a moment.`,
      );
    }
    throw new OllamaError(
      `Could not reach Ollama at ${OLLAMA_HOST}. Make sure "ollama serve" is running and ${OLLAMA_MODEL} is pulled.`,
    );
  }

  if (!response.ok || !response.body) {
    clearTimeout(timeout);
    if (response.status === 404) {
      throw new OllamaError(`Model "${OLLAMA_MODEL}" isn't pulled. Run "ollama pull ${OLLAMA_MODEL}".`);
    }
    throw new OllamaError(`Ollama returned an error: ${response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  // Two buffering layers: `transportBuffer` accumulates raw bytes into
  // Ollama's own NDJSON transport frames (one `{"message":{"content":...}}`
  // object per streamed chunk), and `lineBuffer` accumulates the actual
  // model-generated text across those frames until a real newline shows up
  // — a single output line is often split across several transport frames.
  let transportBuffer = "";
  let lineBuffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      transportBuffer += decoder.decode(value, { stream: true });

      let frameEnd: number;
      while ((frameEnd = transportBuffer.indexOf("\n")) !== -1) {
        const raw = transportBuffer.slice(0, frameEnd).trim();
        transportBuffer = transportBuffer.slice(frameEnd + 1);
        if (!raw) continue;

        let frame: { message?: { content?: string } };
        try {
          frame = JSON.parse(raw);
        } catch {
          continue;
        }

        lineBuffer += frame.message?.content ?? "";

        let lineEnd: number;
        while ((lineEnd = lineBuffer.indexOf("\n")) !== -1) {
          const line = lineBuffer.slice(0, lineEnd).trim();
          lineBuffer = lineBuffer.slice(lineEnd + 1);
          if (line) yield line;
        }
      }
    }
  } finally {
    clearTimeout(timeout);
  }

  const trailing = lineBuffer.trim();
  if (trailing) yield trailing;
}
