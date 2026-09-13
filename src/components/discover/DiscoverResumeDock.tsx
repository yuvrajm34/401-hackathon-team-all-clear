"use client";

import { FileText, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { EducationEditor } from "@/components/resumes/editor/EducationEditor";
import { ExperienceEditor } from "@/components/resumes/editor/ExperienceEditor";
import { ProfileEditor } from "@/components/resumes/editor/ProfileEditor";
import { ProjectsEditor } from "@/components/resumes/editor/ProjectsEditor";
import { SectionShell } from "@/components/resumes/editor/ItemShell";
import { SkillsEditor } from "@/components/resumes/editor/SkillsEditor";
import { ResumePreview } from "@/components/resumes/ResumePreview";
import { ButtonLink } from "@/components/ui/Button";
import { InlineTextArea } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { normalizeUrl } from "@/lib/jobs/url";
import type { JobListing } from "@/lib/jobs/types";
import { diffAgainstMaster, emptyDiff } from "@/lib/resume";
import { useIsMounted } from "@/lib/useIsMounted";
import { selectMasterResume, useAppStore } from "@/store/useAppStore";

type Pane = "posting" | "resume";

/**
 * Full-height split view: the posting on one side, a tailored copy of the
 * master on the other. The original resume is left alone.
 */
export function DiscoverResumeDock({
  listing,
  open,
  onClose,
}: {
  listing: JobListing | null;
  open: boolean;
  onClose: () => void;
}) {
  const mounted = useIsMounted();
  const panelRef = useRef<HTMLDivElement>(null);
  const master = useAppStore(selectMasterResume);
  const updateResume = useAppStore((state) => state.updateResume);
  const tailored = useAppStore((state) => {
    if (!listing) return undefined;
    const target = normalizeUrl(listing.url);
    const application = state.applications.find(
      (item) => item.url && normalizeUrl(item.url) === target,
    );
    if (!application) return undefined;
    return (
      state.resumes.find(
        (item) => item.id === application.resumeId && !item.isMaster,
      ) ??
      state.resumes.find(
        (item) =>
          item.targetApplicationId === application.id && !item.isMaster,
      )
    );
  });
  const [pane, setPane] = useState<Pane>("posting");

  const diff = useMemo(() => {
    if (!tailored || !master) return emptyDiff();
    return diffAgainstMaster(tailored, master);
  }, [tailored, master]);

  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    setPane("posting");
  }, [listing?.id]);

  if (!mounted || !open || !listing) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex print:hidden">
      <button
        type="button"
        aria-label="Close resume panel"
        onClick={onClose}
        className="absolute inset-0 bg-scrim"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Tailor a resume for ${listing.position} at ${listing.company}`}
        className="relative ml-auto flex h-full w-full flex-col rounded-l-[1.25rem] bg-surface-raised shadow-raised lg:w-[min(72rem,100%)]"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 bg-surface px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p className="text-xs text-ink-subtle">{listing.company}</p>
            <h2 className="truncate text-base font-semibold text-ink">
              {listing.position}
            </h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              Rewrite a copy for this posting. Your master stays as-is.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-muted hover:text-ink"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="flex shrink-0 gap-1 border-b border-line bg-surface px-3 py-2 lg:hidden">
          <button
            type="button"
            onClick={() => setPane("posting")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium",
              pane === "posting"
                ? "bg-brand-soft text-brand-on-soft"
                : "text-ink-muted",
            )}
          >
            Posting
          </button>
          <button
            type="button"
            onClick={() => setPane("resume")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium",
              pane === "resume"
                ? "bg-brand-soft text-brand-on-soft"
                : "text-ink-muted",
            )}
          >
            Resume
          </button>
        </div>

        <div className="grid min-h-0 flex-1 lg:grid-cols-2">
          <section
            className={cn(
              "min-h-0 overflow-y-auto border-line p-4 sm:p-5 lg:border-r",
              pane === "posting" ? "block" : "hidden lg:block",
            )}
          >
            <h3 className="text-xs font-medium text-ink-muted">
              What they asked for
            </h3>
            {listing.description ? (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                {listing.description}
              </p>
            ) : (
              <p className="mt-2 text-sm text-ink-subtle">
                No description was saved for this posting.
              </p>
            )}
          </section>

          <section
            className={cn(
              "min-h-0 overflow-y-auto p-4 sm:p-5",
              pane === "resume" ? "block" : "hidden lg:block",
            )}
          >
            {tailored ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-medium text-ink-muted">
                    Tailored for this role
                  </h3>
                  <div className="flex items-center gap-1">
                    {master ? (
                      <ButtonLink
                        href={`/resumes/${master.id}`}
                        variant="ghost"
                        size="sm"
                      >
                        Open master
                      </ButtonLink>
                    ) : null}
                    <ButtonLink
                      href={`/resumes/${tailored.id}`}
                      variant="ghost"
                      size="sm"
                    >
                      Open full editor
                    </ButtonLink>
                  </div>
                </div>

                <ResumePreview resume={tailored} />

                <ProfileEditor resume={tailored} />

                <SectionShell
                  title="Summary"
                  description="Two or three lines aimed at this role."
                >
                  <InlineTextArea
                    value={tailored.summary}
                    rows={4}
                    aria-label="Professional summary"
                    className="border-line bg-surface"
                    onChange={(event) =>
                      updateResume(tailored.id, (draft) => {
                        draft.summary = event.target.value;
                      })
                    }
                  />
                </SectionShell>

                <ExperienceEditor
                  resume={tailored}
                  master={master}
                  diff={diff}
                />
                <ProjectsEditor resume={tailored} master={master} diff={diff} />
                <EducationEditor
                  resume={tailored}
                  master={master}
                  diff={diff}
                />
                <SkillsEditor resume={tailored} master={master} diff={diff} />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-line px-4 py-8 text-center">
                <FileText
                  size={20}
                  className="mx-auto text-ink-subtle"
                  aria-hidden="true"
                />
                <p className="mt-2 text-sm font-medium text-ink">
                  {master
                    ? "Could not start a tailored copy"
                    : "You need a master resume first"}
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  {master
                    ? "Close this panel and try Tailor a resume again."
                    : "Start one, then come back and write a version for this posting."}
                </p>
                {!master ? (
                  <ButtonLink href="/resumes" className="mt-4" size="sm">
                    Start a master resume
                  </ButtonLink>
                ) : null}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}
