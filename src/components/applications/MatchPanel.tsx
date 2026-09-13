"use client";

import { Loader2, Sparkles, Target } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { ButtonLink, Button } from "@/components/ui/Button";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { cn } from "@/lib/cn";
import { buildMatchReport, scoreLabel } from "@/lib/keywords";
import { resumeText } from "@/lib/resume";
import type { Application, Resume } from "@/lib/types";

/**
 * Compares the job description against the resume attached to this
 * application: a keyword-overlap score for a quick read, plus genuine,
 * specific AI tailoring suggestions (reframes and flagged gaps) instead of
 * a raw "missing terms" list — that used to surface generic posting
 * language as a "skill" the resume was missing, with a one-click button to
 * bolt it on verbatim.
 */
export function MatchPanel({
  application,
  resume,
}: {
  application: Application;
  resume: Resume | undefined;
}) {
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState("");

  const getSuggestions = async () => {
    if (!resume) return;
    setSuggestLoading(true);
    setSuggestError("");
    setSuggestions([]);
    try {
      const response = await fetch("/api/resume/tailor-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: resumeText(resume),
          jobDescription: application.jobDescription,
        }),
      });
      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setSuggestError(payload?.error || "Could not generate suggestions.");
        return;
      }

      // Read the streamed lines as they arrive and render each one right
      // away — the model takes 10-20+ seconds to finish end to end, and
      // waiting for the whole batch left this panel showing a bare spinner
      // that whole time. See ollamaStreamLines in lib/ollama.ts.
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let sawError = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newline: number;
        while ((newline = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (!line) continue;
          if (line.startsWith("__ERROR__:")) {
            sawError = line.slice("__ERROR__:".length);
            continue;
          }
          setSuggestions((prev) => [...(prev ?? []), line]);
        }
      }

      if (sawError) setSuggestError(sawError);
    } catch {
      setSuggestError("Could not reach the AI suggestion service.");
    } finally {
      setSuggestLoading(false);
    }
  };

  const report = useMemo(
    () =>
      buildMatchReport(
        application.jobDescription,
        resume ? resumeText(resume) : "",
      ),
    [application.jobDescription, resume],
  );

  const hasJobDescription = application.jobDescription.trim().length > 0;
  const { label, tone } = scoreLabel(report.score);

  return (
    <Panel>
      <PanelHeader
        title="Keyword match"
        description="How closely the linked resume echoes this posting."
      />
      <PanelBody>
        {!hasJobDescription ? (
          <Hint>
            Paste the job description into this application to score it
            against your resume and get tailored suggestions.
          </Hint>
        ) : !resume ? (
          <Hint>
            Link a resume to this application and the posting will be scored
            against it. You can tailor one from the{" "}
            <Link href="/resumes" className="font-medium text-brand underline">
              resume hub
            </Link>
            .
          </Hint>
        ) : report.hits.length === 0 ? (
          <Hint>
            The job description is too short to pull meaningful keywords from.
          </Hint>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <ProgressRing
                value={report.score}
                size={84}
                thickness={7}
                label={`Keyword match ${report.score} percent`}
                indicatorClassName={cn(
                  tone === "strong" && "stroke-positive",
                  tone === "fair" && "stroke-accent",
                  tone === "weak" && "stroke-negative",
                )}
              >
                <span className="text-lg font-semibold text-ink">
                  {report.score}
                  <span className="text-xs font-normal text-ink-subtle">%</span>
                </span>
              </ProgressRing>

              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{label}</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {report.matched.length} of {report.hits.length} key terms
                  appear in{" "}
                  <Link
                    href={`/resumes/${resume.id}`}
                    className="font-medium text-brand underline"
                  >
                    {resume.name}
                  </Link>
                  .
                </p>
                <p className="mt-1 text-[11px] text-ink-subtle">
                  Weighted by how often each term shows up in the posting.
                </p>
              </div>
            </div>

            {report.matched.length > 0 ? (
              <section>
                <h3 className="mb-1.5 text-xs font-medium text-ink-muted">
                  Already covered
                </h3>
                <ul className="flex flex-wrap gap-1.5">
                  {report.matched.map((hit) => (
                    <li
                      key={hit.keyword}
                      title={
                        hit.matchedVia
                          ? `Matched through "${hit.matchedVia}"`
                          : undefined
                      }
                      className="chip-tone rounded-lg bg-positive-soft px-1.5 py-0.5 text-[11px] text-positive"
                    >
                      {hit.keyword}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="border-t border-line pt-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-medium text-ink-muted">
                  AI tailoring suggestions
                </h3>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={getSuggestions}
                  disabled={suggestLoading}
                >
                  {suggestLoading ? (
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Sparkles size={14} aria-hidden="true" />
                  )}
                  {suggestions ? "Regenerate" : "Get suggestions"}
                </Button>
              </div>

              {suggestError ? (
                <p className="mt-2 text-xs text-negative">
                  {suggestError}
                </p>
              ) : null}

              {suggestions && suggestions.length > 0 ? (
                <ul className="mt-2 space-y-1.5">
                  {suggestions.map((suggestion, index) => (
                    <li
                      key={index}
                      className="rounded-lg bg-surface-muted/60 px-3 py-2 text-xs leading-relaxed text-ink-muted"
                    >
                      {suggestion}
                    </li>
                  ))}
                  {suggestLoading ? (
                    <li className="flex items-center gap-1.5 px-3 py-1 text-[11px] text-ink-subtle">
                      <Loader2 size={11} className="animate-spin" aria-hidden="true" />
                      Still generating…
                    </li>
                  ) : null}
                </ul>
              ) : suggestLoading ? (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-subtle">
                  <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                  Reading the resume and posting…
                </p>
              ) : suggestions && suggestions.length === 0 ? (
                <p className="mt-2 text-xs text-ink-subtle">
                  Nothing to flag — the resume already lines up well with this
                  posting.
                </p>
              ) : !suggestError ? (
                <p className="mt-2 text-xs text-ink-subtle">
                  Runs a local Ollama model (gemma3) to suggest specific
                  edits beyond keyword matching. Requires{" "}
                  <code className="rounded bg-surface-muted px-1 py-0.5">
                    ollama serve
                  </code>{" "}
                  running locally.
                </p>
              ) : null}
            </section>
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-surface-muted/60 p-3">
      <Target size={16} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden="true" />
      <p className="text-xs leading-relaxed text-ink-muted">{children}</p>
    </div>
  );
}

/** Shown on the resume editor when a tailored resume has a target application. */
export function MatchSummaryLink({
  application,
  resume,
}: {
  application: Application;
  resume: Resume;
}) {
  const report = useMemo(
    () => buildMatchReport(application.jobDescription, resumeText(resume)),
    [application.jobDescription, resume],
  );

  if (report.empty) return null;
  const { tone } = scoreLabel(report.score);

  return (
    <ButtonLink
      href={`/applications/${application.id}`}
      variant="secondary"
      size="sm"
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          tone === "strong" && "bg-positive",
          tone === "fair" && "bg-accent",
          tone === "weak" && "bg-negative",
        )}
        aria-hidden="true"
      />
      {report.score}% match · {application.company}
    </ButtonLink>
  );
}
