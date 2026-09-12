/**
 * Reads an uploaded resume (PDF / Word template / text) and returns the
 * extracted copy. Parsing into structured fields still happens in the
 * browser — this route only turns the file into text.
 */

import { extractResumeFromBytes } from "@/lib/resume-extract";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "Attach a resume file." }, { status: 400 });
  }
  if (file.size === 0) {
    return Response.json({ error: "That file is empty." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Keep the file under 8 MB." }, { status: 400 });
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const extracted = await extractResumeFromBytes(file.name, bytes);
    return Response.json(extracted);
  } catch (caught) {
    const message =
      caught instanceof Error && caught.message
        ? caught.message
        : "Could not read that file.";
    return Response.json({ error: message }, { status: 422 });
  }
}
