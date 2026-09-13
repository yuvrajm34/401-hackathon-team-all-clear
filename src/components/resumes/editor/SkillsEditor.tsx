"use client";

import { Eye, EyeOff, RotateCcw, Trash2 } from "lucide-react";

import { InlineInput } from "@/components/ui/Field";
import { TagInput } from "@/components/ui/TagInput";
import { cn } from "@/lib/cn";
import { createSkillGroup, type ResumeDiff } from "@/lib/resume";
import type { Resume } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

import { AddButton, EmptyRow } from "./ExperienceEditor";
import { IconAction, SectionShell } from "./ItemShell";

export function SkillsEditor({
  resume,
  master,
  diff,
}: {
  resume: Resume;
  master: Resume | undefined;
  diff: ResumeDiff;
}) {
  const updateResume = useAppStore((state) => state.updateResume);

  return (
    <SectionShell
      title="Skills"
      description="Group them the way a recruiter scans: languages, frameworks, tools."
      action={
        <AddButton
          label="Add group"
          onClick={() =>
            updateResume(resume.id, (draft) => {
              draft.skills.push(createSkillGroup());
            })
          }
        />
      }
    >
      {resume.skills.length === 0 ? (
        <EmptyRow>No skill groups yet.</EmptyRow>
      ) : null}

      {resume.skills.map((group, index) => {
        const changed = diff.changedItemIds.has(group.id);
        return (
          <div
            key={group.id}
            className={cn(
              "rounded-lg border bg-surface p-2.5",
              group.enabled
                ? "border-line"
                : "border-dashed border-line-strong opacity-70",
            )}
          >
            <div className="mb-1.5 flex items-center gap-1">
              <InlineInput
                value={group.label}
                placeholder="Languages"
                aria-label={`Skill group ${index + 1} label`}
                className="font-medium"
                onChange={(event) =>
                  updateResume(resume.id, (draft) => {
                    draft.skills[index].label = event.target.value;
                  })
                }
              />

              {changed ? (
                <span className="shrink-0 text-[10px] text-ink-muted">
                  edited
                </span>
              ) : null}

              <div className="flex shrink-0 items-center">
                {changed && master ? (
                  <IconAction
                    label="Reset this group to the master version"
                    onClick={() =>
                      updateResume(resume.id, (draft) => {
                        const original = master.skills.find(
                          (candidate) => candidate.id === group.id,
                        );
                        if (original) {
                          draft.skills[index] = structuredClone(original);
                        }
                      })
                    }
                  >
                    <RotateCcw size={13} aria-hidden="true" />
                  </IconAction>
                ) : null}
                <IconAction
                  label={
                    group.enabled
                      ? `Hide the ${group.label || "group"} row`
                      : `Show the ${group.label || "group"} row`
                  }
                  active={!group.enabled}
                  onClick={() =>
                    updateResume(resume.id, (draft) => {
                      draft.skills[index].enabled = !draft.skills[index].enabled;
                    })
                  }
                >
                  {group.enabled ? (
                    <Eye size={13} aria-hidden="true" />
                  ) : (
                    <EyeOff size={13} aria-hidden="true" />
                  )}
                </IconAction>
                <IconAction
                  label={`Delete the ${group.label || "group"} row`}
                  danger
                  onClick={() =>
                    updateResume(resume.id, (draft) => {
                      draft.skills.splice(index, 1);
                    })
                  }
                >
                  <Trash2 size={13} aria-hidden="true" />
                </IconAction>
              </div>
            </div>

            <TagInput
              values={group.skills}
              placeholder="TypeScript, Python"
              onChange={(skills) =>
                updateResume(resume.id, (draft) => {
                  draft.skills[index].skills = skills;
                })
              }
            />
          </div>
        );
      })}
    </SectionShell>
  );
}
