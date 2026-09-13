"use client";

import { useMemo, useState } from "react";

import { cn } from "@/lib/cn";
import { todayIso } from "@/lib/dates";
import { PRIORITY_LABELS, STAGE_META, WORK_MODE_LABELS } from "@/lib/stages";
import { STAGES, type Application, type Stage, type WorkMode } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

import { Button } from "@/components/ui/Button";
import {
  Field,
  LabeledInput,
  LabeledTextArea,
  Select,
} from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SlideOver } from "@/components/ui/SlideOver";
import { TagInput } from "@/components/ui/TagInput";
import { toast } from "@/components/ui/Toaster";

interface FormState {
  company: string;
  position: string;
  location: string;
  workMode: WorkMode;
  url: string;
  salary: string;
  stage: Stage;
  dateApplied: string;
  followUpDate: string;
  jobDescription: string;
  notes: string;
  tags: string[];
  resumeId: string;
  priority: 1 | 2 | 3;
}

function initialState(
  application: Application | undefined,
  defaultStage: Stage,
): FormState {
  if (application) {
    return {
      company: application.company,
      position: application.position,
      location: application.location,
      workMode: application.workMode,
      url: application.url,
      salary: application.salary,
      stage: application.stage,
      dateApplied: application.dateApplied,
      followUpDate: application.followUpDate,
      jobDescription: application.jobDescription,
      notes: application.notes,
      tags: application.tags,
      resumeId: application.resumeId ?? "",
      priority: application.priority,
    };
  }

  return {
    company: "",
    position: "",
    location: "",
    workMode: "unknown",
    url: "",
    salary: "",
    stage: defaultStage,
    dateApplied: defaultStage === "wishlist" ? "" : todayIso(),
    followUpDate: "",
    jobDescription: "",
    notes: "",
    tags: [],
    resumeId: "",
    priority: 2,
  };
}

interface ApplicationFormProps {
  open: boolean;
  onClose: () => void;
  application?: Application;
  defaultStage?: Stage;
  onCreated?: (id: string) => void;
}

/**
 * Create/edit form for an application. The same component powers the global
 * quick-add and the "Edit" action on the detail page.
 *
 * Nothing is rendered while closed, so every open starts from a fresh mount
 * with fresh state — no effect needed to reset the fields between rows.
 */
export function ApplicationForm(props: ApplicationFormProps) {
  if (!props.open) return null;
  return <ApplicationFormFields {...props} />;
}

function ApplicationFormFields({
  open,
  onClose,
  application,
  defaultStage = "applied",
  onCreated,
}: ApplicationFormProps) {
  const addApplication = useAppStore((state) => state.addApplication);
  const updateApplication = useAppStore((state) => state.updateApplication);
  const resumes = useAppStore((state) => state.resumes);
  const existingTags = useAppStore((state) => state.applications);

  const [form, setForm] = useState<FormState>(() =>
    initialState(application, defaultStage),
  );
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {},
  );

  const tagSuggestions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of existingTags) {
      for (const tag of item.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag)
      .slice(0, 10);
  }, [existingTags]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = () => {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.company.trim()) nextErrors.company = "Company is required";
    if (!form.position.trim()) nextErrors.position = "Role is required";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      ...form,
      resumeId: form.resumeId || null,
      dateApplied:
        form.stage === "wishlist"
          ? form.dateApplied
          : form.dateApplied || todayIso(),
    };

    if (application) {
      updateApplication(application.id, payload);
      toast(`Updated ${payload.company}`);
    } else {
      const id = addApplication(payload);
      toast(`Added ${payload.company} — ${payload.position}`);
      onCreated?.(id);
    }

    onClose();
  };

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      width="lg"
      title={application ? "Edit application" : "Add application"}
      description={
        application
          ? "Changes save when you press Save."
          : "Only the company and role are required — fill in the rest later."
      }
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {application ? "Save changes" : "Add application"}
          </Button>
        </div>
      }
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <LabeledInput
            label="Company"
            required
            autoComplete="organization"
            placeholder="Stripe"
            value={form.company}
            error={errors.company}
            onChange={(event) => set("company", event.target.value)}
          />
          <LabeledInput
            label="Role"
            required
            placeholder="Software Engineer Intern"
            value={form.position}
            error={errors.position}
            onChange={(event) => set("position", event.target.value)}
          />
        </div>

        <Field label="Stage">
          <div className="flex flex-wrap gap-1.5">
            {STAGES.map((stage) => {
              const meta = STAGE_META[stage];
              const active = form.stage === stage;
              return (
                <button
                  key={stage}
                  type="button"
                  onClick={() => {
                    set("stage", stage);
                    if (stage !== "wishlist" && !form.dateApplied) {
                      set("dateApplied", todayIso());
                    }
                  }}
                  aria-pressed={active}
                  className={cn(
                    "rounded-lg px-2.5 py-1.5 text-xs font-medium ring-1 ring-inset transition",
                    active
                      ? meta.badge
                      : "bg-surface text-ink-muted ring-line hover:bg-surface-muted",
                  )}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <LabeledInput
            label={form.stage === "wishlist" ? "Target apply date" : "Date applied"}
            type="date"
            value={form.dateApplied}
            onChange={(event) => set("dateApplied", event.target.value)}
          />
          <LabeledInput
            label="Follow up on"
            type="date"
            hint="Shows up on the dashboard when due"
            value={form.followUpDate}
            onChange={(event) => set("followUpDate", event.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <LabeledInput
            label="Location"
            placeholder="Toronto, ON"
            value={form.location}
            onChange={(event) => set("location", event.target.value)}
          />
          <Field label="Work mode">
            <SegmentedControl<WorkMode>
              ariaLabel="Work mode"
              className="flex w-full flex-wrap"
              value={form.workMode}
              onChange={(value) => set("workMode", value)}
              segments={(
                Object.entries(WORK_MODE_LABELS) as [WorkMode, string][]
              ).map(([value, label]) => ({
                value,
                label: value === "onsite" ? "On-site" : label,
              }))}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <LabeledInput
            label="Posting link"
            type="url"
            inputMode="url"
            placeholder="https://"
            value={form.url}
            onChange={(event) => set("url", event.target.value)}
          />
          <LabeledInput
            label="Compensation"
            placeholder="$110k or $45/hr"
            value={form.salary}
            onChange={(event) => set("salary", event.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Priority">
            <Select
              value={String(form.priority)}
              onChange={(event) =>
                set("priority", Number(event.target.value) as 1 | 2 | 3)
              }
            >
              {([3, 2, 1] as const).map((level) => (
                <option key={level} value={level}>
                  {PRIORITY_LABELS[level]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Resume used"
            hint={
              resumes.length === 0
                ? "Create a resume first to link one here"
                : undefined
            }
          >
            <Select
              value={form.resumeId}
              onChange={(event) => set("resumeId", event.target.value)}
            >
              <option value="">Not linked</option>
              {resumes.map((resume) => (
                <option key={resume.id} value={resume.id}>
                  {resume.name}
                  {resume.isMaster ? " (master)" : ""}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <TagInput
          label="Tags"
          values={form.tags}
          onChange={(tags) => set("tags", tags)}
          suggestions={tagSuggestions}
          placeholder="react, dream-list"
        />

        <LabeledTextArea
          label="Job description"
          hint="Paste the posting — it powers the keyword match score."
          rows={7}
          value={form.jobDescription}
          onChange={(event) => set("jobDescription", event.target.value)}
        />

        <LabeledTextArea
          label="Notes"
          rows={3}
          placeholder="Referral, interview format, anything worth remembering."
          value={form.notes}
          onChange={(event) => set("notes", event.target.value)}
        />
      </form>
    </SlideOver>
  );
}
