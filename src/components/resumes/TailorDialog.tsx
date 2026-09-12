"use client";

import { Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Field, LabeledInput, Select } from "@/components/ui/Field";
import { SlideOver } from "@/components/ui/SlideOver";
import { toast } from "@/components/ui/Toaster";
import { STAGE_META } from "@/lib/stages";
import { useAppStore } from "@/store/useAppStore";

interface TailorDialogProps {
  open: boolean;
  onClose: () => void;
  masterId: string;
}

/**
 * Clones the master resume for a specific application. Keeping this in one
 * place means tailoring always starts from the same source of truth.
 *
 * Unmounted while closed so each open starts with empty fields.
 */
export function TailorDialog(props: TailorDialogProps) {
  if (!props.open) return null;
  return <TailorDialogForm {...props} />;
}

function TailorDialogForm({ open, onClose, masterId }: TailorDialogProps) {
  const router = useRouter();
  const applications = useAppStore((state) => state.applications);
  const resumes = useAppStore((state) => state.resumes);
  const tailorResume = useAppStore((state) => state.tailorResume);

  const [applicationId, setApplicationId] = useState("");
  const [name, setName] = useState("");

  // Applications without a tailored resume are the ones worth suggesting.
  const candidates = useMemo(() => {
    const tailoredTargets = new Set(
      resumes
        .filter((resume) => !resume.isMaster && resume.targetApplicationId)
        .map((resume) => resume.targetApplicationId),
    );

    return [...applications].sort((a, b) => {
      const aTailored = tailoredTargets.has(a.id) ? 1 : 0;
      const bTailored = tailoredTargets.has(b.id) ? 1 : 0;
      if (aTailored !== bTailored) return aTailored - bTailored;
      return b.priority - a.priority;
    });
  }, [applications, resumes]);

  const selected = applications.find((item) => item.id === applicationId);

  const suggestedName = selected
    ? `${selected.company} — ${selected.position}`
    : "Tailored resume";

  const submit = () => {
    const newId = tailorResume({
      masterId,
      applicationId: applicationId || null,
      name: name.trim() || suggestedName,
    });

    if (!newId) {
      toast("Could not find the master resume", "warning");
      return;
    }

    toast(
      selected
        ? `Tailored copy created and linked to ${selected.company}`
        : "Tailored copy created",
    );
    onClose();
    router.push(`/resumes/${newId}`);
  };

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title="Tailor a copy"
      description="Start from your master resume, then hide or rewrite what does not fit."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>
            <Wand2 size={14} aria-hidden="true" />
            Create copy
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <Field
          label="Tailor for"
          hint="Linking an application unlocks the keyword match score and attaches this resume to it."
        >
          <Select
            value={applicationId}
            onChange={(event) => setApplicationId(event.target.value)}
          >
            <option value="">No specific application</option>
            {candidates.map((application) => (
              <option key={application.id} value={application.id}>
                {application.company} — {application.position} (
                {STAGE_META[application.stage].label})
              </option>
            ))}
          </Select>
        </Field>

        <LabeledInput
          label="Name"
          value={name}
          placeholder={suggestedName}
          hint="Leave blank to use the suggestion."
          onChange={(event) => setName(event.target.value)}
        />

        <div className="rounded-lg bg-surface-muted/60 p-3 text-xs leading-relaxed text-ink-muted">
          <p className="font-medium text-ink">What gets copied</p>
          <p className="mt-1">
            Everything, including the lines you have hidden. Each entry keeps a
            link back to the master, so any line you rewrite is badged
            &ldquo;edited&rdquo; and can be reset with one click.
          </p>
        </div>
      </div>
    </SlideOver>
  );
}
