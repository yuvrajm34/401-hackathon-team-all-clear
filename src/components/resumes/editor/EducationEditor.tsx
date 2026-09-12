"use client";

import { InlineInput, InlineTextArea } from "@/components/ui/Field";
import { createEducation, type ResumeDiff } from "@/lib/resume";
import type { Resume } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

import { AddButton, EmptyRow } from "./ExperienceEditor";
import { ItemShell, SectionShell, moveItem } from "./ItemShell";

export function EducationEditor({
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
      title="Education"
      action={
        <AddButton
          label="Add school"
          onClick={() =>
            updateResume(resume.id, (draft) => {
              draft.education.push(createEducation());
            })
          }
        />
      }
    >
      {resume.education.length === 0 ? (
        <EmptyRow>No education entries yet.</EmptyRow>
      ) : null}

      {resume.education.map((item, index) => (
        <ItemShell
          key={item.id}
          title={item.school || "New school"}
          subtitle={item.degree}
          enabled={item.enabled}
          changed={diff.changedItemIds.has(item.id)}
          onToggleEnabled={() =>
            updateResume(resume.id, (draft) => {
              draft.education[index].enabled = !draft.education[index].enabled;
            })
          }
          onDelete={() =>
            updateResume(resume.id, (draft) => {
              draft.education.splice(index, 1);
            })
          }
          onMoveUp={
            index > 0
              ? () =>
                  updateResume(resume.id, (draft) => {
                    moveItem(draft.education, index, index - 1);
                  })
              : undefined
          }
          onMoveDown={
            index < resume.education.length - 1
              ? () =>
                  updateResume(resume.id, (draft) => {
                    moveItem(draft.education, index, index + 1);
                  })
              : undefined
          }
          onReset={
            master
              ? () =>
                  updateResume(resume.id, (draft) => {
                    const original = master.education.find(
                      (candidate) => candidate.id === item.id,
                    );
                    if (original) {
                      draft.education[index] = { ...original };
                    }
                  })
              : undefined
          }
        >
          <div className="grid gap-1.5 sm:grid-cols-2">
            <InlineInput
              value={item.school}
              placeholder="University of Toronto"
              aria-label="School"
              className="font-medium"
              onChange={(event) =>
                updateResume(resume.id, (draft) => {
                  draft.education[index].school = event.target.value;
                })
              }
            />
            <InlineInput
              value={item.degree}
              placeholder="BSc Computer Science"
              aria-label="Degree"
              onChange={(event) =>
                updateResume(resume.id, (draft) => {
                  draft.education[index].degree = event.target.value;
                })
              }
            />
            <InlineInput
              value={item.location}
              placeholder="Toronto, ON"
              aria-label="Location"
              onChange={(event) =>
                updateResume(resume.id, (draft) => {
                  draft.education[index].location = event.target.value;
                })
              }
            />
            <div className="flex items-center gap-1">
              <InlineInput
                value={item.start}
                placeholder="Sep 2022"
                aria-label="Start"
                onChange={(event) =>
                  updateResume(resume.id, (draft) => {
                    draft.education[index].start = event.target.value;
                  })
                }
              />
              <span className="text-xs text-ink-subtle">–</span>
              <InlineInput
                value={item.end}
                placeholder="Apr 2026"
                aria-label="End"
                onChange={(event) =>
                  updateResume(resume.id, (draft) => {
                    draft.education[index].end = event.target.value;
                  })
                }
              />
            </div>
          </div>

          <InlineTextArea
            value={item.details}
            rows={2}
            aria-label="Details"
            placeholder="GPA, honours, relevant coursework."
            onChange={(event) =>
              updateResume(resume.id, (draft) => {
                draft.education[index].details = event.target.value;
              })
            }
          />
        </ItemShell>
      ))}
    </SectionShell>
  );
}
