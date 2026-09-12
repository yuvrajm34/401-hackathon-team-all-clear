"use client";

import { Briefcase, Code2, Globe, Link2, Plus, Trash2 } from "lucide-react";

import { Field, LabeledInput, TextInput } from "@/components/ui/Field";
import { createId } from "@/lib/ids";
import type { Resume } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

import { IconAction, SectionShell } from "./ItemShell";

// lucide dropped brand marks, so these are the closest generic equivalents.
const LINK_ICONS = [
  { match: /linkedin/i, Icon: Briefcase },
  { match: /github|gitlab|bitbucket/i, Icon: Code2 },
  { match: /portfolio|website|site|blog/i, Icon: Globe },
] as const;

function iconFor(label: string) {
  return LINK_ICONS.find((entry) => entry.match.test(label))?.Icon ?? Link2;
}

export function ProfileEditor({ resume }: { resume: Resume }) {
  const updateResume = useAppStore((state) => state.updateResume);
  const { profile } = resume;

  const setProfile = (patch: Partial<typeof profile>) =>
    updateResume(resume.id, (draft) => {
      Object.assign(draft.profile, patch);
    });

  return (
    <SectionShell
      title="Contact details"
      description="Appears at the top of every export."
    >
      <div className="grid gap-2.5 sm:grid-cols-2">
        <LabeledInput
          label="Full name"
          value={profile.fullName}
          autoComplete="name"
          placeholder="Alex Rivera"
          onChange={(event) => setProfile({ fullName: event.target.value })}
        />
        <LabeledInput
          label="Headline"
          value={profile.headline}
          placeholder="Full stack developer"
          onChange={(event) => setProfile({ headline: event.target.value })}
        />
        <LabeledInput
          label="Email"
          type="email"
          autoComplete="email"
          value={profile.email}
          placeholder="you@example.com"
          onChange={(event) => setProfile({ email: event.target.value })}
        />
        <LabeledInput
          label="Phone"
          type="tel"
          autoComplete="tel"
          value={profile.phone}
          placeholder="(416) 555-0184"
          onChange={(event) => setProfile({ phone: event.target.value })}
        />
        <LabeledInput
          label="Location"
          value={profile.location}
          placeholder="Toronto, ON"
          className="sm:col-span-2"
          onChange={(event) => setProfile({ location: event.target.value })}
        />
      </div>

      <Field
        label="Links"
        hint="Leave a URL blank to keep the row without printing it."
        className="pt-1"
      >
        <div className="space-y-1.5">
          {profile.links.map((link, index) => {
            const Icon = iconFor(link.label);
            return (
              <div key={link.id} className="flex items-center gap-1.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink-subtle">
                  <Icon size={14} aria-hidden="true" />
                </span>
                <TextInput
                  value={link.label}
                  aria-label={`Link ${index + 1} label`}
                  placeholder="LinkedIn"
                  className="w-28 shrink-0"
                  onChange={(event) =>
                    updateResume(resume.id, (draft) => {
                      draft.profile.links[index].label = event.target.value;
                    })
                  }
                />
                <TextInput
                  value={link.url}
                  aria-label={`Link ${index + 1} URL`}
                  inputMode="url"
                  placeholder="linkedin.com/in/you"
                  onChange={(event) =>
                    updateResume(resume.id, (draft) => {
                      draft.profile.links[index].url = event.target.value;
                    })
                  }
                />
                <IconAction
                  label={`Remove the ${link.label || "link"} row`}
                  danger
                  onClick={() =>
                    updateResume(resume.id, (draft) => {
                      draft.profile.links.splice(index, 1);
                    })
                  }
                >
                  <Trash2 size={13} aria-hidden="true" />
                </IconAction>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() =>
              updateResume(resume.id, (draft) => {
                draft.profile.links.push({
                  id: createId("lnk"),
                  label: "",
                  url: "",
                });
              })
            }
            className="inline-flex items-center gap-1 rounded-md border border-dashed border-line-strong px-2 py-1 text-xs text-ink-muted transition hover:border-brand hover:text-brand"
          >
            <Plus size={12} aria-hidden="true" />
            Add link
          </button>
        </div>
      </Field>
    </SectionShell>
  );
}
