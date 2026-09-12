"use client";

import { InlineInput } from "@/components/ui/Field";
import { createBullet, createProject, type ResumeDiff } from "@/lib/resume";
import type { Resume } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

import {
  AddButton,
  BulletEditor,
  EmptyRow,
} from "./ExperienceEditor";
import { ItemShell, SectionShell, moveItem } from "./ItemShell";

export function ProjectsEditor({
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
      title="Projects"
      description="Side projects, coursework, anything you built."
      action={
        <AddButton
          label="Add project"
          onClick={() =>
            updateResume(resume.id, (draft) => {
              draft.projects.unshift(createProject());
            })
          }
        />
      }
    >
      {resume.projects.length === 0 ? (
        <EmptyRow>
          No projects yet. These carry a lot of weight early in a career.
        </EmptyRow>
      ) : null}

      {resume.projects.map((item, index) => (
        <ItemShell
          key={item.id}
          title={item.name || "New project"}
          subtitle={item.tech}
          enabled={item.enabled}
          changed={diff.changedItemIds.has(item.id)}
          onToggleEnabled={() =>
            updateResume(resume.id, (draft) => {
              draft.projects[index].enabled = !draft.projects[index].enabled;
            })
          }
          onDelete={() =>
            updateResume(resume.id, (draft) => {
              draft.projects.splice(index, 1);
            })
          }
          onMoveUp={
            index > 0
              ? () =>
                  updateResume(resume.id, (draft) => {
                    moveItem(draft.projects, index, index - 1);
                  })
              : undefined
          }
          onMoveDown={
            index < resume.projects.length - 1
              ? () =>
                  updateResume(resume.id, (draft) => {
                    moveItem(draft.projects, index, index + 1);
                  })
              : undefined
          }
          onReset={
            master
              ? () =>
                  updateResume(resume.id, (draft) => {
                    const original = master.projects.find(
                      (candidate) => candidate.id === item.id,
                    );
                    if (original) {
                      draft.projects[index] = structuredClone(original);
                    }
                  })
              : undefined
          }
        >
          <div className="grid gap-1.5 sm:grid-cols-2">
            <InlineInput
              value={item.name}
              placeholder="Project name"
              aria-label="Project name"
              className="font-medium"
              onChange={(event) =>
                updateResume(resume.id, (draft) => {
                  draft.projects[index].name = event.target.value;
                })
              }
            />
            <InlineInput
              value={item.tech}
              placeholder="Next.js, TypeScript"
              aria-label="Technologies used"
              onChange={(event) =>
                updateResume(resume.id, (draft) => {
                  draft.projects[index].tech = event.target.value;
                })
              }
            />
            <InlineInput
              value={item.link}
              placeholder="github.com/you/project"
              aria-label="Project link"
              inputMode="url"
              onChange={(event) =>
                updateResume(resume.id, (draft) => {
                  draft.projects[index].link = event.target.value;
                })
              }
            />
            <div className="flex items-center gap-1">
              <InlineInput
                value={item.start}
                placeholder="2026"
                aria-label="Start"
                onChange={(event) =>
                  updateResume(resume.id, (draft) => {
                    draft.projects[index].start = event.target.value;
                  })
                }
              />
              <span className="text-xs text-ink-subtle">–</span>
              <InlineInput
                value={item.end}
                placeholder="Present"
                aria-label="End"
                onChange={(event) =>
                  updateResume(resume.id, (draft) => {
                    draft.projects[index].end = event.target.value;
                  })
                }
              />
            </div>
          </div>

          <BulletEditor
            bullets={item.bullets}
            diff={diff}
            onChangeText={(bulletIndex, text) =>
              updateResume(resume.id, (draft) => {
                draft.projects[index].bullets[bulletIndex].text = text;
              })
            }
            onToggle={(bulletIndex) =>
              updateResume(resume.id, (draft) => {
                const bullet = draft.projects[index].bullets[bulletIndex];
                bullet.enabled = !bullet.enabled;
              })
            }
            onDelete={(bulletIndex) =>
              updateResume(resume.id, (draft) => {
                draft.projects[index].bullets.splice(bulletIndex, 1);
              })
            }
            onReset={
              master
                ? (bulletIndex, bulletId) =>
                    updateResume(resume.id, (draft) => {
                      const original = master.projects
                        .find((candidate) => candidate.id === item.id)
                        ?.bullets.find((candidate) => candidate.id === bulletId);
                      if (original) {
                        draft.projects[index].bullets[bulletIndex] = {
                          ...original,
                        };
                      }
                    })
                : undefined
            }
            onAdd={() =>
              updateResume(resume.id, (draft) => {
                draft.projects[index].bullets.push(createBullet());
              })
            }
          />
        </ItemShell>
      ))}
    </SectionShell>
  );
}
