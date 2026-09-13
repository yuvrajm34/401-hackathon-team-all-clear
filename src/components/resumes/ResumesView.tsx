"use client";

import {
  ChevronDown,
  Crown,
  Download,
  FileCode2,
  FilePlus2,
  FileText,
  Target,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { HydrationGate } from "@/components/layout/HydrationGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, ButtonLink, buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Sparkline } from "@/components/ui/Sparkline";
import { toast } from "@/components/ui/Toaster";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { downloadTextFile, slugify } from "@/lib/download";
import { buildMatchReport, matchSignal } from "@/lib/keywords";
import { resumeToLatex } from "@/lib/latex";
import { resumeText } from "@/lib/resume";
import { downloadResumePdf } from "@/lib/resume-pdf";
import { computeResumePerformance } from "@/lib/stats";
import type { Resume } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

import { TailorDialog } from "./TailorDialog";
import { UploadResumeButton } from "./UploadResumeDialog";

export function ResumesView() {
  return (
    <HydrationGate>
      <ResumesViewInner />
    </HydrationGate>
  );
}

function ResumesViewInner() {
  const router = useRouter();

  const resumes = useAppStore((state) => state.resumes);
  const applications = useAppStore((state) => state.applications);
  const communications = useAppStore((state) => state.communications);
  const createMasterResume = useAppStore((state) => state.createMasterResume);
  const loadDemoData = useAppStore((state) => state.loadDemoData);

  const [tailorOpen, setTailorOpen] = useState(false);

  const master = resumes.find((resume) => resume.isMaster);
  const tailored = resumes.filter((resume) => !resume.isMaster);

  const performance = useMemo(
    () => computeResumePerformance(applications, communications),
    [applications, communications],
  );

  if (resumes.length === 0) {
    return (
      <>
        <PageHeader
          title="Resumes"
        />
        <EmptyState
          icon={<FileText size={20} aria-hidden="true" />}
          title="Start with a master resume"
          description="Put everything in it — every role, every bullet, every skill. Tailored copies are made by hiding what does not fit, so nothing is ever retyped."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <UploadResumeButton variant="primary" label="Upload resume" />
              <Button
                variant="secondary"
                onClick={() => {
                  const id = createMasterResume();
                  router.push(`/resumes/${id}`);
                }}
              >
                <FilePlus2 size={16} aria-hidden="true" />
                Start from scratch
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  loadDemoData();
                  toast("Sample data loaded");
                }}
              >
                Load sample data
              </Button>
            </div>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Resumes"
        actions={
          master ? (
            <div className="flex flex-wrap gap-2">
              <UploadResumeButton size="md" label="Upload resume" />
              <Button variant="secondary" onClick={() => setTailorOpen(true)}>
                <Wand2 size={16} aria-hidden="true" />
                Tailor a copy
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => {
                const id = createMasterResume();
                router.push(`/resumes/${id}`);
              }}
            >
              <FilePlus2 size={16} aria-hidden="true" />
              Create master resume
            </Button>
          )
        }
      />

      <div className="space-y-4">
        {master ? <MasterCard resume={master} /> : null}

        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink">
            Your Tailored Resumes
            <span className="ml-1.5 font-normal text-ink-subtle">
              {tailored.length}
            </span>
          </h2>

          {tailored.length === 0 ? (
            <EmptyState
              icon={<Wand2 size={18} aria-hidden="true" />}
              title="No tailored copies yet"
              description="Pick a role you care about and make a copy. Hiding two bullets and rewriting the summary takes a minute and is the highest-leverage edit you can make."
              action={
                master ? (
                  <Button variant="secondary" onClick={() => setTailorOpen(true)}>
                    Tailor a copy
                  </Button>
                ) : null
              }
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {tailored.map((resume) => (
                <TailoredCard
                  key={resume.id}
                  resume={resume}
                />
              ))}
            </ul>
          )}
        </section>

        {performance.length > 1 ? (
          <Panel>
            <PanelHeader
              title="Effective Resumes"
              description="Interview rate per resume, across the applications it was used for."
            />
            <PanelBody className="space-y-2">
              {performance.map((entry) => {
                const resume = resumes.find((item) => item.id === entry.resumeId);
                if (!resume) return null;
                return (
                  <div key={entry.resumeId} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <Link
                        href={`/resumes/${resume.id}`}
                        className="truncate font-medium text-ink hover:text-ink-muted"
                      >
                        {resume.name}
                      </Link>
                      <span className="flex shrink-0 items-center gap-2">
                        {entry.used >= 3 ? (
                          <Sparkline
                            values={[0, entry.interviewRate]}
                            className="h-3 w-[72px]"
                            label={`${entry.interviewRate} percent interview rate`}
                          />
                        ) : null}
                        <span
                          className={cn(
                            "font-numeral",
                            entry.used >= 3 && entry.interviewRate >= 50
                              ? "text-positive"
                              : entry.used >= 3 && entry.interviewRate === 0
                                ? "text-negative"
                                : "text-ink-muted",
                          )}
                        >
                          {entry.interviews} of {entry.used} reached interview
                          {entry.offers > 0 ? ` · ${entry.offers} offer` : ""}
                        </span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </PanelBody>
          </Panel>
        ) : null}
      </div>

      {master ? (
        <TailorDialog
          open={tailorOpen}
          onClose={() => setTailorOpen(false)}
          masterId={master.id}
        />
      ) : null}
    </>
  );
}

function MasterCard({ resume }: { resume: Resume }) {
  const completeness = computeCompleteness(resume);

  return (
    <Panel className="brand-wash">
      <PanelBody className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <ProgressRing
          value={completeness}
          size={92}
          label={`Master resume ${completeness} percent complete`}
        >
          <span className="font-numeral text-lg font-semibold text-ink">
            {completeness}%
          </span>
          <span className="text-[10px] text-ink-subtle">complete</span>
        </ProgressRing>

        <div className="min-w-0 flex-1">
          <span className="text-[11px] text-ink-subtle">
            Updated{" "}
            <span className="font-numeral">
              {formatDate(resume.updatedAt.slice(0, 10))}
            </span>
          </span>

          <div className="mt-1 flex min-w-0 items-center gap-1.5">
            <h2 className="truncate text-lg font-semibold text-ink">
              {resume.name}
            </h2>
            <span
              className="shrink-0 text-accent"
              aria-label="Master resume"
              title="Master resume"
            >
              <Crown size={15} aria-hidden="true" />
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <ButtonLink href={`/resumes/${resume.id}`} size="sm">
              Open editor
            </ButtonLink>
            <UploadResumeButton size="sm" label="Replace from file" />
            <ResumeExportMenu resume={resume} />
          </div>
        </div>
      </PanelBody>
    </Panel>
  );
}

function TailoredCard({
  resume,
}: {
  resume: Resume;
}) {
  const applications = useAppStore((state) => state.applications);
  const application = applications.find(
    (item) => item.id === resume.targetApplicationId,
  );

  const match = application?.jobDescription
    ? buildMatchReport(application.jobDescription, resumeText(resume))
    : null;

  return (
    <li className="flex flex-col rounded-[1.75rem] bg-surface p-4 shadow-card transition-[box-shadow] duration-200 hover:shadow-raised">
      <Link href={`/resumes/${resume.id}`} className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-ink">
          {resume.name}
        </h3>
      </Link>

      {application ? (
        <Link
          href={`/applications/${application.id}`}
          className="mt-0.5 truncate text-xs text-ink-muted hover:text-brand"
        >
          {application.company} — {application.position}
        </Link>
      ) : (
        <p className="mt-0.5 text-xs text-ink-subtle">
          Not linked to an application
        </p>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {match && !match.empty ? (
          <span
            className={cn(
              "chip-tone font-numeral inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[11px]",
              matchSignal(match.score) === "positive" && "bg-positive-soft text-positive",
              matchSignal(match.score) === "negative" && "bg-negative-soft text-negative",
              matchSignal(match.score) === "neutral" && "bg-accent-soft text-accent-on-soft",
            )}
          >
            <Target size={10} aria-hidden="true" />
            {match.score}% match
          </span>
        ) : null}

      </div>

      <div className="mt-3 flex gap-1.5 pt-1">
        <ButtonLink
          href={`/resumes/${resume.id}`}
          variant="secondary"
          size="sm"
          className="flex-1"
        >
          Open
        </ButtonLink>
        <ResumeExportMenu resume={resume} />
      </div>
    </li>
  );
}

function ResumeExportMenu({ resume }: { resume: Resume }) {
  const closeMenu = (target: HTMLElement) => {
    target.closest("details")?.removeAttribute("open");
  };

  return (
    <details className="relative">
      <summary
        className={buttonClasses({
          variant: "secondary",
          size: "sm",
          className: "cursor-pointer list-none [&::-webkit-details-marker]:hidden",
        })}
      >
        <Download size={14} aria-hidden="true" />
        Export
        <ChevronDown size={13} aria-hidden="true" />
      </summary>
      <div className="absolute right-0 z-20 mt-1 min-w-32 rounded-xl bg-surface-raised p-1 shadow-raised">
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-ink hover:bg-surface-muted"
          onClick={(event) => {
            downloadResumePdf(resume);
            toast("Resume PDF downloaded");
            closeMenu(event.currentTarget);
          }}
        >
          <FileText size={14} aria-hidden="true" />
          Export .pdf
        </button>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-ink hover:bg-surface-muted"
          onClick={(event) => {
            downloadTextFile(
              `${slugify(resume.name)}.tex`,
              resumeToLatex(resume),
              "application/x-tex;charset=utf-8",
            );
            toast("LaTeX file downloaded");
            closeMenu(event.currentTarget);
          }}
        >
          <FileCode2 size={14} aria-hidden="true" />
          Export .tex
        </button>
      </div>
    </details>
  );
}

/** Rough completeness signal so the master card has something to nudge toward. */
function computeCompleteness(resume: Resume): number {
  const checks: boolean[] = [
    Boolean(resume.profile.fullName.trim()),
    Boolean(resume.profile.email.trim()),
    Boolean(resume.profile.phone.trim() || resume.profile.location.trim()),
    resume.profile.links.some((link) => link.url.trim()),
    resume.summary.trim().length > 40,
    resume.experience.some(
      (item) => item.company.trim() && item.bullets.some((b) => b.text.trim()),
    ),
    resume.experience.filter((item) => item.bullets.length >= 2).length >= 1,
    resume.education.some((item) => item.school.trim()),
    resume.skills.some((group) => group.skills.length > 0),
    resume.projects.some((item) => item.name.trim()),
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
