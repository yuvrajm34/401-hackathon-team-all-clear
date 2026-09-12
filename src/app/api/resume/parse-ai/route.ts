/**
 * Parses extracted resume text into structured fields using a local Ollama
 * model instead of the regex heuristics in resume-parse.ts. Handles
 * whatever sections a given resume actually has (some have Projects, some
 * don't; skills might be grouped or a flat list) far better than fixed
 * regex patterns can.
 *
 * Optional: requires Ollama running locally. The client falls back to the
 * heuristic parser (resume-parse.ts) when this route fails for any reason.
 */
import { ollamaJson, OllamaError } from "@/lib/ollama";
import type { ParsedLink, ParsedResume } from "@/lib/resume-parse";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You extract structured data from resume text. Return ONLY a JSON object matching this exact shape, no commentary:

{
  "profile": {
    "fullName": string,
    "headline": string,
    "email": string,
    "phone": string,
    "location": string,
    "links": [{ "label": string, "url": string }]
  },
  "summary": string,
  "experience": [{ "company": string, "role": string, "location": string, "start": string, "end": string, "bullets": string[] }],
  "education": [{ "school": string, "degree": string, "location": string, "start": string, "end": string, "details": string }],
  "projects": [{ "name": string, "tech": string, "link": string, "start": string, "end": string, "bullets": string[] }],
  "skills": [{ "label": string, "skills": string[] }]
}

Rules:
- Only include information that is actually present in the text. Never invent names, employers, dates, or numbers.
- Use "" for a text field that isn't present, and [] for a list section the resume doesn't have (e.g. no Projects section means "projects": []).
- Keep dates exactly as written in the resume (e.g. "Aug 2021", "2021", "Present").
- "headline" is a short title line under the name, if the resume has one (e.g. "Software Engineer") — not the summary paragraph.
- Group skills the way the resume groups them (e.g. "Languages", "Frameworks"). If skills are a flat unlabeled list, use a single group labeled "Skills".
- "links" should only include entries with a real URL (LinkedIn, GitHub, portfolio, etc.) — not the email address.
- Bullets should be the individual achievement lines under a role/project, without the leading bullet character.`;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    text?: string;
    links?: ParsedLink[];
  } | null;

  const text = body?.text?.trim();
  if (!text) {
    return Response.json({ error: "No resume text to parse." }, { status: 400 });
  }

  try {
    const parsed = await ollamaJson<ParsedResume>({
      system: SYSTEM_PROMPT,
      prompt: text.slice(0, 12_000),
    });

    const normalized = normalize(parsed, body?.links ?? []);
    return Response.json({ parsed: normalized });
  } catch (caught) {
    const message =
      caught instanceof OllamaError ? caught.message : "AI parsing failed.";
    return Response.json({ error: message }, { status: 502 });
  }
}

/** Defensive coercion — a local model can drop fields or return wrong types. */
function normalize(raw: unknown, hintedLinks: ParsedLink[]): ParsedResume {
  const obj = (raw ?? {}) as Partial<ParsedResume>;
  const profile = obj.profile ?? ({} as ParsedResume["profile"]);

  const str = (value: unknown) => (typeof value === "string" ? value : "");
  const arr = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

  const links: ParsedLink[] = [
    ...hintedLinks,
    ...arr<ParsedLink>(profile.links)
      .filter((link) => link && typeof link === "object")
      .map((link) => ({ label: str(link.label), url: str(link.url) }))
      .filter((link) => link.url),
  ];

  return {
    profile: {
      fullName: str(profile.fullName),
      headline: str(profile.headline),
      email: str(profile.email),
      phone: str(profile.phone),
      location: str(profile.location),
      links,
    },
    summary: str(obj.summary),
    experience: arr<Record<string, unknown>>(obj.experience).map((item) => ({
      company: str(item.company),
      role: str(item.role),
      location: str(item.location),
      start: str(item.start),
      end: str(item.end),
      bullets: arr<unknown>(item.bullets).map(str).filter(Boolean),
    })),
    education: arr<Record<string, unknown>>(obj.education).map((item) => ({
      school: str(item.school),
      degree: str(item.degree),
      location: str(item.location),
      start: str(item.start),
      end: str(item.end),
      details: str(item.details),
    })),
    projects: arr<Record<string, unknown>>(obj.projects).map((item) => ({
      name: str(item.name),
      tech: str(item.tech),
      link: str(item.link),
      start: str(item.start),
      end: str(item.end),
      bullets: arr<unknown>(item.bullets).map(str).filter(Boolean),
    })),
    skills: arr<Record<string, unknown>>(obj.skills).map((item) => ({
      label: str(item.label) || "Skills",
      skills: arr<unknown>(item.skills).map(str).filter(Boolean),
    })),
  };
}
