"use client";

import {
  ArrowLeft,
  Banknote,
  CalendarClock,
  ExternalLink,
  FileText,
  Flag,
  MapPin,
  Pencil,
  Trash2,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

import { HydrationGate } from "@/components/layout/HydrationGate";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { ConfirmDialog } from "@/components/ui/SlideOver";
import { TextArea } from "@/components/ui/Field";
import { toast } from "@/components/ui/Toaster";
import { formatDate, formatRelativeDay } from "@/lib/dates";
import {
  listingIdCandidates,
  readListingPreview,
} from "@/lib/jobs/listing-id";
import {
  PRIORITY_LABELS,
  STAGE_META,
  WORK_MODE_LABELS,
} from "@/lib/stages";
import type { Stage } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

import { ApplicationForm } from "./ApplicationForm";
import { CommunicationLog } from "./CommunicationLog";
import { FollowUpCard } from "./FollowUpCard";
import { JobPostingPreview } from "./JobPostingPreview";
import { MatchPanel } from "./MatchPanel";
import { ReminderList } from "./ReminderList";
import { StageStepper } from "./StageBadge";

export function ApplicationDetailView({ id }: { id: string }) {
  return (
    <HydrationGate>
      <ApplicationDetailInner id={id} />
    </HydrationGate>
  );
}

function ApplicationDetailInner({ id }: { id: string }) {
  const router = useRouter();
  const ids = useMemo(() => listingIdCandidates(id), [id]);

  const application = useAppStore((state) =>
    state.applications.find((item) => ids.includes(item.id)),
  );
  const previewFromStore = useAppStore((state) => {
    for (const key of ids) {
      const hit = state.discoverPreviews[key];
      if (hit) return hit;
    }
    return undefined;
  });
  const previewListing = previewFromStore ?? readListingPreview(id);
  const communications = useAppStore((state) => state.communications);
  const reminders = useAppStore((state) => state.reminders);
  const resumes = useAppStore((state) => state.resumes);
  const ownerName = useAppStore((state) => state.settings.ownerName);

  const moveApplicationToStage = useAppStore(
    (state) => state.moveApplicationToStage,
  );
  const updateApplication = useAppStore((state) => state.updateApplication);
  const deleteApplication = useAppStore((state) => state.deleteApplication);
  const tailorResume = useAppStore((state) => state.tailorResume);
  const importJobListing = useAppStore((state) => state.importJobListing);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const applicationMessages = useMemo(
    () => communications.filter((c) => c.applicationId === id),
    [communications, id],
  );
  const applicationReminders = useMemo(
    () => reminders.filter((r) => r.applicationId === id),
    [reminders, id],
  );

  if (!application) {
    if (previewListing) {
      const master = resumes.find((item) => item.isMaster);
      return (
        <JobPostingPreview
          listing={previewListing}
          resume={master}
          onAdd={() => {
            const newId = importJobListing(previewListing);
            if (!newId) return;
            toast(
              `${previewListing.position} at ${previewListing.company} added to your wishlist`,
            );
            router.replace(`/applications/${newId}`);
          }}
        />
      );
    }

    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-lg font-semibold text-ink">
          That application is gone
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          It may have been deleted, or the link points at data from a different
          browser.
        </p>
        <ButtonLink href="/applications" className="mt-4">
          Back to applications
        </ButtonLink>
      </div>
    );
  }

  const resume = resumes.find((item) => item.id === application.resumeId);
  const master = resumes.find((item) => item.isMaster);

  const handleStageChange = (stage: Stage) => {
    moveApplicationToStage(application.id, stage);
    if (stage === "offer") {
      toast(`Offer from ${application.company}. Congratulations.`);
    } else {
      toast(`Moved to ${STAGE_META[stage].label}`);
    }
  };

  const handleTailor = () => {
    if (!master) {
      toast("Create a master resume first", "warning");
      return;
    }
    const newId = tailorResume({
      masterId: master.id,
      applicationId: application.id,
      name: `${application.company} — ${application.position}`,
    });
    if (newId) {
      toast("Tailored resume created from your master");
      router.push(`/resumes/${newId}`);
    }
  };

  return (
    <div className="space-y-4">
      <Link
        href="/applications"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition hover:text-ink"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        All applications
      </Link>

      <header className="rounded-2xl bg-surface p-4 shadow-card sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-balance text-xl font-semibold tracking-tight text-ink sm:text-2xl">
              {application.company}
            </h1>
            <p className="mt-0.5 text-sm text-ink-muted">
              {application.position}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {application.url ? (
              <a
                href={application.url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-surface-muted px-3 text-sm font-medium text-ink transition hover:bg-brand-soft hover:text-brand-on-soft"
              >
                <ExternalLink size={14} aria-hidden="true" />
                Posting
              </a>
            ) : null}
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <Pencil size={14} aria-hidden="true" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete application"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 size={16} aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div className="mt-4">
          <h2 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-subtle">
            Stage
          </h2>
          <StageStepper value={application.stage} onChange={handleStageChange} />
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <Fact
          icon={<CalendarClock size={13} aria-hidden="true" />}
          label={application.stage === "wishlist" ? "Target date" : "Applied"}
          value={
            application.dateApplied ? (
              <span className="font-numeral">
                {formatDate(application.dateApplied)}
              </span>
            ) : (
              "Not set"
            )
          }
        />
        <Fact
          icon={<MapPin size={13} aria-hidden="true" />}
          label="Location"
          value={
            application.location
              ? `${application.location}${
                  application.workMode !== "unknown"
                    ? ` · ${WORK_MODE_LABELS[application.workMode]}`
                    : ""
                }`
              : WORK_MODE_LABELS[application.workMode]
          }
        />
        <Fact
          icon={<Banknote size={13} aria-hidden="true" />}
          label="Compensation"
          value={application.salary || "Not listed"}
        />
        <Fact
          icon={<Flag size={13} aria-hidden="true" />}
          label="Priority"
          value={PRIORITY_LABELS[application.priority]}
        />
        <Fact
          icon={<CalendarClock size={13} aria-hidden="true" />}
          label="Follow up"
          value={
            application.followUpDate
              ? formatRelativeDay(application.followUpDate)
              : "Not scheduled"
          }
        />
      </dl>

      <FollowUpCard
        application={application}
        communications={applicationMessages}
        ownerName={ownerName}
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <CommunicationLog
            application={application}
            communications={applicationMessages}
          />

          <Panel>
            <PanelHeader
              title="Job description"
              description={
                application.jobDescription
                  ? "Used for the keyword match score."
                  : "Paste the posting to unlock the match score."
              }
              action={
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditOpen(true)}
                >
                  Edit
                </Button>
              }
            />
            <PanelBody>
              {application.jobDescription ? (
                <div className="scrollbar-slim max-h-72 overflow-x-hidden overflow-y-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-ink-muted">
                  {application.jobDescription}
                </div>
              ) : (
                <p className="text-xs text-ink-subtle">
                  Nothing saved yet.
                </p>
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title="Notes"
              description="Saved as you type."
            />
            <PanelBody>
              <TextArea
                aria-label="Notes"
                rows={5}
                value={application.notes}
                placeholder="Interview format, names, salary expectations, anything worth remembering."
                onChange={(event) =>
                  updateApplication(application.id, {
                    notes: event.target.value,
                  })
                }
              />
            </PanelBody>
          </Panel>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Panel>
            <PanelHeader
              title="Resume"
              description={
                resume
                  ? resume.isMaster
                    ? "Using your master resume as-is."
                    : "A tailored version is attached."
                  : "Nothing attached yet."
              }
            />
            <PanelBody className="space-y-2.5">
              {resume ? (
                <>
                  <Link
                    href={`/resumes/${resume.id}`}
                    className="flex items-center gap-2 rounded-xl bg-surface-muted px-3 py-2 text-sm font-medium text-ink transition hover:bg-brand-soft hover:text-brand-on-soft"
                  >
                    <FileText size={15} aria-hidden="true" />
                    <span className="truncate">{resume.name}</span>
                  </Link>
                  {resume.isMaster ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={handleTailor}
                    >
                      <Wand2 size={14} aria-hidden="true" />
                      Tailor a copy for this role
                    </Button>
                  ) : null}
                </>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={handleTailor}
                >
                  <Wand2 size={14} aria-hidden="true" />
                  Tailor a resume for this role
                </Button>
              )}
            </PanelBody>
          </Panel>

          <MatchPanel application={application} resume={resume} />

          <ReminderList
            applicationId={application.id}
            reminders={applicationReminders}
          />
        </div>
      </div>

      <ApplicationForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        application={application}
      />

      <ConfirmDialog
        open={deleteOpen}
        title={`Delete ${application.company}?`}
        message="The application, its logged messages, and its reminders will be removed. Tailored resumes are kept."
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          deleteApplication(application.id);
          toast(`${application.company} deleted`, "info");
          router.push("/applications");
        }}
      />
    </div>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-xl bg-surface-muted px-3 py-2">
      <dt className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-ink-subtle">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm text-ink">
        {value}
      </dd>
    </div>
  );
}
