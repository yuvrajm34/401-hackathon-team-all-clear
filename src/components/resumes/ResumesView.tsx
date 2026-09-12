"use client";

import {
  Crown,
  FileCode2,
  FilePlus2,
  FileText,
  Printer,
  Target,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { HydrationGate } from "@/components/layout/HydrationGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { toast } from "@/components/ui/Toaster";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { downloadTextFile, slugify } from "@/lib/download";
import { buildMatchReport } from "@/lib/keywords";
import { resumeToLatex } from "@/lib/latex";
import { diffAgainstMaster, resumeText, visibleResume } from "@/lib/resume";
import { computeResumePerformance } from "@/lib/stats";
import type { Resume } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

import { TailorDialog } from "./TailorDialog";

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
          description="One master resume, then a tailored copy for each role that deserves one."
        />
        <EmptyState
          icon={<FileText size={20} aria-hidden="true" />}
          title="Start with a master resume"
          description="Put everything in it — every role, every bullet, every skill. Tailored copies are made by hiding what does not fit, so nothing is ever retyped."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                onClick={() => {
                  const id = createMasterResume();
                  router.push(`/resumes/${id}`);
                }}
              >
                <FilePlus2 size={16} aria-hidden="true" />
                Create master resume
              </Button>
              <Button
                variant="secondary"
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
        description="One master resume, then a tailored copy for each role that deserves one."
        actions={
          master ? (
            <Button variant="secondary" onClick={() => setTailorOpen(true)}>
              <Wand2 size={16} aria-hidden="true" />
              Tailor a copy
            </Button>
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
            Tailored versions
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
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {tailored.map((resume) => (
                <TailoredCard
                  key={resume.id}
                  resume={resume}
                  master={master}
                  performance={performance.find(
                    (entry) => entry.resumeId === resume.id,
                  )}
                />
              ))}
            </ul>
          )}
        </section>

        {performance.length > 1 ? (
          <Panel>
            <PanelHeader
              title="Which version is working"
              description="Interview rate per resume, across the applications it was used for."
            />
            <PanelBody className="space-y-2">
              {performance.map((entry) => {
                const resume = resumes.find((item) => item.id === entry.resumeId);
                if (!resume) return null;
                return (
                  <div key={entry.resumeId} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <Link
                        href={`/resumes/${resume.id}`}
                        className="truncate font-medium text-ink hover:text-brand"
                      >
                        {resume.name}
                      </Link>
                      <span className="shrink-0 text-ink-muted">
                        {entry.interviews}/{entry.used} reached interview
                        {entry.offers > 0 ? ` · ${entry.offers} offer` : ""}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
                      <div
                        className="h-full rounded-full bg-brand transition-[width] duration-700"
                        style={{ width: `${entry.interviewRate}%` }}
                      />
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
  const visible = visibleResume(resume);

  return (
    <Panel className="brand-wash">
      <PanelBody className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <ProgressRing
          value={completeness}
          size={92}
          label={`Master resume ${completeness} percent complete`}
        >
          <span className="text-lg font-semibold text-ink">{completeness}%</span>
          <span className="text-[10px] text-ink-subtle">complete</span>
        </ProgressRing>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
              <Crown size={11} aria-hidden="true" />
              Master
            </span>
            <span className="text-[11px] text-ink-subtle">
              Updated {formatDate(resume.updatedAt.slice(0, 10))}
            </span>
          </div>

          <h2 className="mt-1 truncate text-lg font-semibold text-ink">
            {resume.name}
          </h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            {resume.profile.fullName || "Add your name"} ·{" "}
            {visible.experience.length} role
            {visible.experience.length === 1 ? "" : "s"} ·{" "}
            {visible.projects.length} project
            {visible.projects.length === 1 ? "" : "s"} ·{" "}
            {visible.skills.reduce((total, group) => total + group.skills.length, 0)}{" "}
            skills
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <ButtonLink href={`/resumes/${resume.id}`} size="sm">
              Open editor
            </ButtonLink>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                downloadTextFile(
                  `${slugify(resume.name)}.tex`,
                  resumeToLatex(resume),
                  "application/x-tex;charset=utf-8",
                );
                toast("LaTeX file downloaded");
              }}
            >
              <FileCode2 size={14} aria-hidden="true" />
              .tex
            </Button>
          </div>
        </div>
      </PanelBody>
    </Panel>
  );
}

function TailoredCard({
  resume,
  master,
  performance,
}: {
  resume: Resume;
  master: Resume | undefined;
  performance?: { used: number; interviews: number };
}) {
  const applications = useAppStore((state) => state.applications);
  const application = applications.find(
    (item) => item.id === resume.targetApplicationId,
  );

  const diff = master ? diffAgainstMaster(resume, master) : null;
  const match = application?.jobDescription
    ? buildMatchReport(application.jobDescription, resumeText(resume))
    : null;

  return (
    <li className="flex flex-col rounded-xl border border-line bg-surface p-3.5 shadow-card transition hover:border-line-strong">
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
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
              match.score >= 70
                ? "bg-positive/10 text-positive"
                : match.score >= 45
                  ? "bg-accent-soft text-accent"
                  : "bg-negative/10 text-negative",
            )}
          >
            <Target size={10} aria-hidden="true" />
            {match.score}% match
          </span>
        ) : null}

        {diff ? (
          <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[11px] font-medium text-brand-ink">
            {diff.totalChanges} edit{diff.totalChanges === 1 ? "" : "s"}
          </span>
        ) : null}

        {performance && performance.used > 0 ? (
          <span className="rounded-md bg-surface-muted px-1.5 py-0.5 text-[11px] text-ink-muted">
            {performance.interviews}/{performance.used} interviews
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
          <Printer size={13} aria-hidden="true" />
          Open
        </ButtonLink>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            downloadTextFile(
              `${slugify(resume.name)}.tex`,
              resumeToLatex(resume),
              "application/x-tex;charset=utf-8",
            );
            toast("LaTeX file downloaded");
          }}
        >
          <FileCode2 size={13} aria-hidden="true" />
          .tex
        </Button>
      </div>
    </li>
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
