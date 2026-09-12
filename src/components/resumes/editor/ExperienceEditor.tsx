"use client";

import { Eye, EyeOff, Plus, RotateCcw, Trash2 } from "lucide-react";

import { InlineInput, InlineTextArea } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { createBullet, createExperience, type ResumeDiff } from "@/lib/resume";
import type { Resume } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

import { IconAction, ItemShell, SectionShell, moveItem } from "./ItemShell";

export function ExperienceEditor({
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
      title="Experience"
      description="Newest first. Hidden entries stay saved but do not print."
      action={
        <AddButton
          label="Add role"
          onClick={() =>
            updateResume(resume.id, (draft) => {
              draft.experience.unshift(createExperience());
            })
          }
        />
      }
    >
      {resume.experience.length === 0 ? (
        <EmptyRow>No roles yet. Add your most recent one first.</EmptyRow>
      ) : null}

      {resume.experience.map((item, index) => (
        <ItemShell
          key={item.id}
          title={item.role || "New role"}
          subtitle={[item.company, item.start && `${item.start} – ${item.end}`]
            .filter(Boolean)
            .join(" · ")}
          enabled={item.enabled}
          changed={diff.changedItemIds.has(item.id)}
          defaultOpen={resume.experience.length === 1}
          onToggleEnabled={() =>
            updateResume(resume.id, (draft) => {
              draft.experience[index].enabled = !draft.experience[index].enabled;
            })
          }
          onDelete={() =>
            updateResume(resume.id, (draft) => {
              draft.experience.splice(index, 1);
            })
          }
          onMoveUp={
            index > 0
              ? () =>
                  updateResume(resume.id, (draft) => {
                    moveItem(draft.experience, index, index - 1);
                  })
              : undefined
          }
          onMoveDown={
            index < resume.experience.length - 1
              ? () =>
                  updateResume(resume.id, (draft) => {
                    moveItem(draft.experience, index, index + 1);
                  })
              : undefined
          }
          onReset={
            master
              ? () =>
                  updateResume(resume.id, (draft) => {
                    const original = master.experience.find(
                      (candidate) => candidate.id === item.id,
                    );
                    if (original) {
                      draft.experience[index] = structuredClone(original);
                    }
                  })
              : undefined
          }
        >
          <div className="grid gap-1.5 sm:grid-cols-2">
            <InlineInput
              value={item.role}
              placeholder="Role title"
              aria-label="Role title"
              className="font-medium"
              onChange={(event) =>
                updateResume(resume.id, (draft) => {
                  draft.experience[index].role = event.target.value;
                })
              }
            />
            <InlineInput
              value={item.company}
              placeholder="Company"
              aria-label="Company"
              onChange={(event) =>
                updateResume(resume.id, (draft) => {
                  draft.experience[index].company = event.target.value;
                })
              }
            />
            <InlineInput
              value={item.location}
              placeholder="Location"
              aria-label="Location"
              onChange={(event) =>
                updateResume(resume.id, (draft) => {
                  draft.experience[index].location = event.target.value;
                })
              }
            />
            <div className="flex items-center gap-1">
              <InlineInput
                value={item.start}
                placeholder="May 2025"
                aria-label="Start date"
                onChange={(event) =>
                  updateResume(resume.id, (draft) => {
                    draft.experience[index].start = event.target.value;
                  })
                }
              />
              <span className="text-xs text-ink-subtle">–</span>
              <InlineInput
                value={item.end}
                placeholder="Present"
                aria-label="End date"
                onChange={(event) =>
                  updateResume(resume.id, (draft) => {
                    draft.experience[index].end = event.target.value;
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
                draft.experience[index].bullets[bulletIndex].text = text;
              })
            }
            onToggle={(bulletIndex) =>
              updateResume(resume.id, (draft) => {
                const bullet = draft.experience[index].bullets[bulletIndex];
                bullet.enabled = !bullet.enabled;
              })
            }
            onDelete={(bulletIndex) =>
              updateResume(resume.id, (draft) => {
                draft.experience[index].bullets.splice(bulletIndex, 1);
              })
            }
            onReset={
              master
                ? (bulletIndex, bulletId) =>
                    updateResume(resume.id, (draft) => {
                      const original = master.experience
                        .find((candidate) => candidate.id === item.id)
                        ?.bullets.find((candidate) => candidate.id === bulletId);
                      if (original) {
                        draft.experience[index].bullets[bulletIndex] = {
                          ...original,
                        };
                      }
                    })
                : undefined
            }
            onAdd={() =>
              updateResume(resume.id, (draft) => {
                draft.experience[index].bullets.push(createBullet());
              })
            }
          />
        </ItemShell>
      ))}
    </SectionShell>
  );
}

/**
 * Bullet rows with per-line show/hide. Toggling instead of deleting is the
 * core of tailoring: the master keeps everything, each copy shows a subset.
 */
export function BulletEditor({
  bullets,
  diff,
  onChangeText,
  onToggle,
  onDelete,
  onReset,
  onAdd,
}: {
  bullets: { id: string; text: string; enabled: boolean }[];
  diff: ResumeDiff;
  onChangeText: (index: number, text: string) => void;
  onToggle: (index: number) => void;
  onDelete: (index: number) => void;
  onReset?: (index: number, bulletId: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="space-y-1 pt-1">
      <p className="px-1 text-[11px] font-medium uppercase tracking-wide text-ink-subtle">
        Achievements
      </p>

      {bullets.map((bullet, index) => {
        const changed = diff.changedBulletIds.has(bullet.id);
        return (
          <div
            key={bullet.id}
            className={cn(
              "flex items-start gap-1 rounded-md border border-transparent p-0.5 transition",
              !bullet.enabled && "opacity-55",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "mt-3 h-1 w-1 shrink-0 rounded-full",
                bullet.enabled ? "bg-ink-subtle" : "bg-line-strong",
              )}
            />
            <InlineTextArea
              value={bullet.text}
              rows={2}
              aria-label={`Achievement ${index + 1}`}
              placeholder="Start with a verb and land on a number where you can."
              onChange={(event) => onChangeText(index, event.target.value)}
            />
            <div className="flex shrink-0 items-center pt-1.5">
              {changed && onReset ? (
                <IconAction
                  label="Reset this line to the master version"
                  onClick={() => onReset(index, bullet.id)}
                >
                  <RotateCcw size={12} aria-hidden="true" />
                </IconAction>
              ) : null}
              <IconAction
                label={
                  bullet.enabled
                    ? "Hide this line from this resume"
                    : "Show this line"
                }
                onClick={() => onToggle(index)}
                active={!bullet.enabled}
              >
                {bullet.enabled ? (
                  <Eye size={12} aria-hidden="true" />
                ) : (
                  <EyeOff size={12} aria-hidden="true" />
                )}
              </IconAction>
              <IconAction
                label="Delete this line"
                danger
                onClick={() => onDelete(index)}
              >
                <Trash2 size={12} aria-hidden="true" />
              </IconAction>
            </div>
          </div>
        );
      })}

      <AddButton label="Add achievement" onClick={onAdd} />
    </div>
  );
}

export function AddButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md border border-dashed border-line-strong px-2 py-1 text-xs text-ink-muted transition hover:border-brand hover:text-brand"
    >
      <Plus size={12} aria-hidden="true" />
      {label}
    </button>
  );
}

export function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-line-strong px-3 py-4 text-center text-xs text-ink-subtle">
      {children}
    </p>
  );
}
