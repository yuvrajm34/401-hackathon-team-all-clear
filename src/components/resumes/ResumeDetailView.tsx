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
  ClipboardCopy,
  Copy,
  Crown,
  Eye,
  Download,
  FileCode2,
  Pencil,
  Trash2,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { MatchSummaryLink } from "@/components/applications/MatchPanel";
import { HydrationGate } from "@/components/layout/HydrationGate";
import { Button, ButtonLink } from "@/components/ui/Button";
import { InlineTextArea, TextInput } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ConfirmDialog } from "@/components/ui/SlideOver";
import { toast } from "@/components/ui/Toaster";
import { cn } from "@/lib/cn";
import { copyToClipboard, downloadTextFile, slugify } from "@/lib/download";
import { resumeToLatex, resumeToPlainText } from "@/lib/latex";
import {
  diffAgainstMaster,
  emptyDiff,
  estimateLineCount,
  getSectionOrder,
} from "@/lib/resume";
import { downloadResumePdf } from "@/lib/resume-pdf";
import type { ResumeSectionKey } from "@/lib/types";
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

  const exportLatex = () => {
    downloadTextFile(
      `${slugify(resume.name)}.tex`,
      resumeToLatex(resume),
      "application/x-tex;charset=utf-8",
    );
    toast("LaTeX file downloaded — upload it to Overleaf");
  };

  const copyPlainText = async () => {
    const copied = await copyToClipboard(resumeToPlainText(resume));
    toast(
      copied ? "Plain text resume copied" : "Could not access the clipboard",
      copied ? "success" : "warning",
    );
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
            <div className="flex items-center gap-2">
              <TextInput
                value={resume.name}
                aria-label="Resume name"
                onChange={(event) => renameResume(resume.id, event.target.value)}
                className="max-w-sm border-transparent bg-transparent px-1 text-lg font-semibold shadow-none hover:border-line"
              />
              {resume.isMaster ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
                  <Crown size={11} aria-hidden="true" />
                  Master
                </span>
              ) : null}
            </div>

            <p className="mt-1 px-1 text-xs text-ink-muted">
              {resume.isMaster
                ? "Keep everything here. Tailored copies start from this version."
                : diff.totalChanges === 0
                  ? "Identical to your master resume so far."
                  : `${diff.totalChanges} change${
                      diff.totalChanges === 1 ? "" : "s"
                    } from the master version.`}
              {overOnePage ? (
                <span className="ml-1 text-accent">
                  Roughly {Math.ceil(lineEstimate / 46)} pages — consider hiding
                  a few lines.
                </span>
              ) : null}
            </p>
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
                <UploadResumeButton size="sm" label="Upload resume" />
                <Button variant="secondary" onClick={() => setTailorOpen(true)}>
                  <Wand2 size={14} aria-hidden="true" />
                  Tailor a copy
                </Button>
              </>
            ) : null}

            <Button
              onClick={() => {
                downloadResumePdf(resume);
                toast("Resume PDF downloaded");
              }}
            >
              <Download size={14} aria-hidden="true" />
              Download PDF
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={exportLatex}>
            <FileCode2 size={14} aria-hidden="true" />
            Export .tex
          </Button>
          <Button variant="secondary" size="sm" onClick={copyPlainText}>
            <ClipboardCopy size={14} aria-hidden="true" />
            Copy as text
          </Button>
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
