"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  ArrowLeft,
  ChevronDown,
  Copy,
  Crown,
  Eye,
  Download,
  FileCode2,
  FileText,
  Pencil,
  Trash2,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { MatchPanel, MatchSummaryLink } from "@/components/applications/MatchPanel";
import { Select } from "@/components/ui/Field";
import { HydrationGate } from "@/components/layout/HydrationGate";
import { Button, ButtonLink, buttonClasses } from "@/components/ui/Button";
import { InlineTextArea, TextInput } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ConfirmDialog } from "@/components/ui/SlideOver";
import { toast } from "@/components/ui/Toaster";
import { cn } from "@/lib/cn";
import { downloadTextFile, slugify } from "@/lib/download";
import { resumeToLatex } from "@/lib/latex";
import {
  diffAgainstMaster,
  emptyDiff,
  estimateLineCount,
  getSectionOrder,
} from "@/lib/resume";
import { downloadResumePdf } from "@/lib/resume-pdf";
import type { Resume, ResumeSectionKey } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

import { ResumePreview } from "./ResumePreview";
import { TailorDialog } from "./TailorDialog";
import { UploadResumeButton } from "./UploadResumeDialog";
import { EducationEditor } from "./editor/EducationEditor";
import { ExperienceEditor } from "./editor/ExperienceEditor";
import { ProfileEditor } from "./editor/ProfileEditor";
import { ProjectsEditor } from "./editor/ProjectsEditor";
import { SectionShell, SortableSection } from "./editor/ItemShell";
import { SkillsEditor } from "./editor/SkillsEditor";

type Pane = "edit" | "preview";

export function ResumeDetailView({ id }: { id: string }) {
  return (
    <HydrationGate>
      <ResumeDetailInner id={id} />
    </HydrationGate>
  );
}

function ResumeDetailInner({ id }: { id: string }) {
  const router = useRouter();

  const resume = useAppStore((state) =>
    state.resumes.find((item) => item.id === id),
  );
  const resumes = useAppStore((state) => state.resumes);
  const applications = useAppStore((state) => state.applications);
  const updateResume = useAppStore((state) => state.updateResume);
  const renameResume = useAppStore((state) => state.renameResume);
  const duplicateResume = useAppStore((state) => state.duplicateResume);
  const deleteResume = useAppStore((state) => state.deleteResume);
  const promoteToMaster = useAppStore((state) => state.promoteToMaster);

  const [pane, setPane] = useState<Pane>("edit");
  const [tailorOpen, setTailorOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Must run before the `!resume` early return below (Rules of Hooks).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const master = useMemo(
    () => resumes.find((item) => item.isMaster),
    [resumes],
  );

  const diff = useMemo(() => {
    if (!resume || resume.isMaster) return emptyDiff();
    return diffAgainstMaster(resume, master);
  }, [resume, master]);

  useEffect(() => {
    if (!resume) return;
    const previous = document.title;
    const onBeforePrint = () => {
      document.title = resume.profile.fullName || resume.name;
    };
    const onAfterPrint = () => {
      document.title = previous;
    };
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
      document.title = previous;
    };
  }, [resume]);

  if (!resume) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-lg font-semibold text-ink">Resume not found</h1>
        <p className="mt-1 text-sm text-ink-muted">
          It may have been deleted from this browser.
        </p>
        <ButtonLink href="/resumes" className="mt-4">
          Back to resumes
        </ButtonLink>
      </div>
    );
  }

  const targetApplication = applications.find(
    (application) => application.id === resume.targetApplicationId,
  );
  const lineEstimate = estimateLineCount(resume);
  const overOnePage = lineEstimate > 46;

  const sectionOrder = getSectionOrder(resume);

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = sectionOrder.indexOf(active.id as ResumeSectionKey);
    const to = sectionOrder.indexOf(over.id as ResumeSectionKey);
    if (from === -1 || to === -1) return;
    const nextOrder = arrayMove(sectionOrder, from, to);
    updateResume(resume.id, (draft) => {
      draft.sectionOrder = nextOrder;
    });
  };

  const sectionRenderers: Record<ResumeSectionKey, () => React.ReactNode> = {
    summary: () => (
      <SectionShell
        title="Summary"
        description="Two or three lines. Rewrite this per role — it is the fastest win."
        action={
          !resume.isMaster && diff.summaryChanged && master ? (
            <button
              type="button"
              onClick={() =>
                updateResume(resume.id, (draft) => {
                  draft.summary = master.summary;
                })
              }
              className="rounded-md border border-line px-2 py-1 text-[11px] text-ink-muted transition hover:border-brand hover:text-brand"
            >
              Reset to master
            </button>
          ) : null
        }
      >
        <InlineTextArea
          value={resume.summary}
          rows={4}
          aria-label="Professional summary"
          placeholder="What you do, how long you have been doing it, and the thing you want them to remember."
          className="border-line bg-surface"
          onChange={(event) =>
            updateResume(resume.id, (draft) => {
              draft.summary = event.target.value;
            })
          }
        />
      </SectionShell>
    ),
    experience: () => (
      <ExperienceEditor resume={resume} master={master} diff={diff} />
    ),
    projects: () => <ProjectsEditor resume={resume} master={master} diff={diff} />,
    education: () => (
      <EducationEditor resume={resume} master={master} diff={diff} />
    ),
    skills: () => <SkillsEditor resume={resume} master={master} diff={diff} />,
  };

  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <Link
          href="/resumes"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition hover:text-ink"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          All resumes
        </Link>
      </div>

      <header className="space-y-3 print:hidden">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <TextInput
                value={resume.name}
                aria-label="Resume name"
                onChange={(event) => renameResume(resume.id, event.target.value)}
                className={cn(
                  "border-transparent bg-transparent px-1 text-lg font-semibold shadow-none hover:border-line",
                  resume.isMaster ? "max-w-64" : "max-w-sm",
                )}
              />
              {resume.isMaster ? (
                <span
                  className="shrink-0 text-accent"
                  aria-label="Master resume"
                  title="Master resume"
                >
                  <Crown size={16} aria-hidden="true" />
                </span>
              ) : null}
            </div>

            {!resume.isMaster || overOnePage ? (
              <p className="mt-1 px-1 text-xs text-ink-muted">
                {!resume.isMaster
                  ? diff.totalChanges === 0
                    ? "Identical to your master resume so far."
                    : `${diff.totalChanges} change${
                        diff.totalChanges === 1 ? "" : "s"
                      } from the master version.`
                  : null}
              {overOnePage ? (
                <span className="ml-1 text-accent">
                  Roughly {Math.ceil(lineEstimate / 46)} pages — consider hiding
                  a few lines.
                </span>
              ) : null}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {targetApplication ? (
              <MatchSummaryLink
                application={targetApplication}
                resume={resume}
              />
            ) : null}

            {resume.isMaster ? (
              <>
                <UploadResumeButton size="md" label="Upload resume" />
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setTailorOpen(true)}
                >
                  <Wand2 size={14} aria-hidden="true" />
                  Tailor a copy
                </Button>
              </>
            ) : null}

            <ResumeExportMenu resume={resume} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const newId = duplicateResume(resume.id);
              if (newId) {
                toast("Resume duplicated");
                router.push(`/resumes/${newId}`);
              }
            }}
          >
            <Copy size={14} aria-hidden="true" />
            Duplicate
          </Button>
          {!resume.isMaster ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                promoteToMaster(resume.id);
                toast(`${resume.name} is now your master resume`);
              }}
            >
              <Crown size={14} aria-hidden="true" />
              Make this the master
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="text-negative hover:bg-negative/10"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 size={14} aria-hidden="true" />
            Delete
          </Button>

          <SegmentedControl<Pane>
            ariaLabel="Editor or preview"
            value={pane}
            onChange={setPane}
            className="ml-auto lg:hidden"
            segments={[
              {
                value: "edit",
                label: "Edit",
                icon: <Pencil size={13} aria-hidden="true" />,
              },
              {
                value: "preview",
                label: "Preview",
                icon: <Eye size={13} aria-hidden="true" />,
              },
            ]}
          />
        </div>
      </header>

      <ResumeRoleCoach resume={resume} />

      <div className="print-resume-grid grid gap-4 lg:grid-cols-2 lg:items-start">
        <div
          data-print="hide"
          className={cn(
            "space-y-3",
            pane === "edit" ? "block" : "hidden lg:block",
          )}
        >
          <ProfileEditor resume={resume} />

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleSectionDragEnd}
          >
            <SortableContext
              items={sectionOrder}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {sectionOrder.map((key) => (
                  <SortableSection key={key} id={key}>
                    {sectionRenderers[key]()}
                  </SortableSection>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div
          data-print="show"
          className={cn(
            "lg:sticky lg:top-20",
            pane === "preview" ? "block" : "hidden lg:block",
          )}
        >
          <div className="scrollbar-slim lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:pr-1">
            <ResumePreview resume={resume} />
          </div>
        </div>
      </div>

      <TailorDialog
        open={tailorOpen}
        onClose={() => setTailorOpen(false)}
        masterId={resume.id}
      />

      <ConfirmDialog
        open={deleteOpen}
        title={`Delete "${resume.name}"?`}
        message={
          resume.isMaster
            ? "This is your master resume. Tailored copies already created will keep their content but lose the reset-to-master comparison."
            : "Applications linked to this resume will be unlinked."
        }
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          deleteResume(resume.id);
          toast("Resume deleted", "info");
          router.push("/resumes");
        }}
      />
    </div>
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
          size: "md",
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
            toast("LaTeX file downloaded — upload it to Overleaf");
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

function ResumeRoleCoach({ resume }: { resume: Resume }) {
  const applications = useAppStore((state) => state.applications);
  const withJd = useMemo(
    () => applications.filter((item) => item.jobDescription.trim().length > 0),
    [applications],
  );
  const [compareId, setCompareId] = useState(
    () => resume.targetApplicationId ?? "",
  );
  const selected =
    withJd.find((item) => item.id === compareId) ??
    withJd.find((item) => item.id === resume.targetApplicationId) ??
    withJd[0];

  if (!selected) {
    return (
      <p className="print:hidden rounded-2xl bg-surface-muted/70 px-4 py-3 text-xs text-ink-muted">
        Paste a job description on an application to score this resume and get
        AI tailoring suggestions while you edit.
      </p>
    );
  }

  return (
    <div className="print:hidden space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[12rem] flex-1 sm:max-w-sm">
          <span className="mb-1.5 block text-xs font-medium text-ink-muted">
            Tailor For:
          </span>
          <Select
            value={selected.id}
            onChange={(event) => setCompareId(event.target.value)}
            aria-label="Application to compare this resume against"
          >
            {withJd.map((item) => (
              <option key={item.id} value={item.id}>
                {item.company} — {item.position}
              </option>
            ))}
          </Select>
        </label>
        <p className="pb-2 text-[11px] text-ink-subtle">
          Score and AI suggestions sit here so you can edit the resume in the
          same view. Nothing is rewritten automatically.
        </p>
      </div>
      <MatchPanel key={selected.id} application={selected} resume={resume} />
    </div>
  );
}
