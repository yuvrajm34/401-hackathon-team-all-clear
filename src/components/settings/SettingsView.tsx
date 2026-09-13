"use client";

import { Database, Download, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { HydrationGate } from "@/components/layout/HydrationGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { AtmospherePicker } from "@/components/layout/AtmospherePicker";
import { Button } from "@/components/ui/Button";
import { Field, LabeledInput } from "@/components/ui/Field";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { ConfirmDialog } from "@/components/ui/SlideOver";
import { toast } from "@/components/ui/Toaster";
import { downloadTextFile, readFileAsText } from "@/lib/download";
import { SCHEMA_VERSION, type AppSnapshot } from "@/lib/types";
import { STORAGE_KEY, useAppStore } from "@/store/useAppStore";

export function SettingsView() {
  return (
    <HydrationGate>
      <SettingsInner />
    </HydrationGate>
  );
}

function SettingsInner() {
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const exportSnapshot = useAppStore((state) => state.exportSnapshot);
  const importSnapshot = useAppStore((state) => state.importSnapshot);
  const loadDemoData = useAppStore((state) => state.loadDemoData);
  const resetAll = useAppStore((state) => state.resetAll);

  // Selected one at a time: a selector that builds an object would return a
  // fresh reference on every store read and re-render forever.
  const counts = {
    applications: useAppStore((state) => state.applications.length),
    communications: useAppStore((state) => state.communications.length),
    reminders: useAppStore((state) => state.reminders.length),
    resumes: useAppStore((state) => state.resumes.length),
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);

  const handleExport = () => {
    const snapshot = exportSnapshot();
    downloadTextFile(
      `applypath-backup-${snapshot.exportedAt.slice(0, 10)}.json`,
      JSON.stringify(snapshot, null, 2),
      "application/json;charset=utf-8",
    );
    toast("Backup downloaded");
  };

  const handleImport = async (file: File) => {
    try {
      const parsed = JSON.parse(await readFileAsText(file)) as AppSnapshot;

      if (!parsed || !Array.isArray(parsed.applications)) {
        toast("That file is not an ApplyPath backup", "warning");
        return;
      }
      if (parsed.schemaVersion > SCHEMA_VERSION) {
        toast("That backup came from a newer version of ApplyPath", "warning");
        return;
      }

      importSnapshot(parsed);
      toast(`Restored ${parsed.applications.length} applications`);
    } catch {
      toast("Could not read that file", "warning");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <PageHeader
        title="Settings"
        description="Preferences and the data stored in this browser."
      />

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Panel>
          <PanelHeader
            title="Your Name"
            description="Used for greetings and the follow-up email drafts."
          />
          <PanelBody className="space-y-4">
            <LabeledInput
              label="Name"
              value={settings.ownerName}
              autoComplete="name"
              placeholder="Alex Rivera"
              onChange={(event) =>
                updateSettings({ ownerName: event.target.value })
              }
            />

            <Field label="Atmosphere">
              <AtmospherePicker />
            </Field>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader
            title="Goals and nudges"
            description="Tune how hard the dashboard pushes."
          />
          <PanelBody className="space-y-4">
            <LabeledInput
              label="Weekly application goal"
              type="number"
              min={1}
              max={50}
              value={settings.weeklyGoal}
              hint="Drives the progress ring on the dashboard."
              onChange={(event) =>
                updateSettings({
                  weeklyGoal: clamp(Number(event.target.value), 1, 50),
                })
              }
            />
            <LabeledInput
              label="Flag silence after"
              type="number"
              min={3}
              max={90}
              value={settings.followUpAfterDays}
              hint="Days without a reply before an application shows up under 'gone quiet'."
              onChange={(event) =>
                updateSettings({
                  followUpAfterDays: clamp(Number(event.target.value), 3, 90),
                })
              }
            />
          </PanelBody>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Your data"
            description={`Stored in this browser under "${STORAGE_KEY}". Clearing site data deletes it.`}
          />
          <PanelBody className="space-y-4">
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "Applications", value: counts.applications },
                { label: "Logged messages", value: counts.communications },
                { label: "Reminders", value: counts.reminders },
                { label: "Resumes", value: counts.resumes },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl bg-surface-muted px-3 py-2"
                >
                  <dt className="text-[11px] uppercase tracking-wide text-ink-subtle">
                    {item.label}
                  </dt>
                  <dd className="mt-0.5 text-lg font-semibold tabular-nums text-ink">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={handleExport}>
                <Download size={14} aria-hidden="true" />
                Export backup
              </Button>

              <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={14} aria-hidden="true" />
                Import backup
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                aria-hidden="true"
                tabIndex={-1}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleImport(file);
                }}
              />

              <Button variant="ghost" onClick={() => setDemoOpen(true)}>
                <Database size={14} aria-hidden="true" />
                Load sample data
              </Button>

              <Button
                variant="ghost"
                className="text-negative hover:bg-negative/10"
                onClick={() => setResetOpen(true)}
              >
                <Trash2 size={14} aria-hidden="true" />
                Delete everything
              </Button>
            </div>

            <p className="rounded-lg bg-surface-muted/60 p-3 text-xs leading-relaxed text-ink-muted">
              ApplyPath has no server and no account. That means your salary
              notes and interview feedback never leave your machine, but it also
              means a cleared browser takes your data with it. Export a backup
              before switching devices — importing restores everything exactly
              as it was.
            </p>
          </PanelBody>
        </Panel>
      </div>

      <ConfirmDialog
        open={demoOpen}
        title="Replace your data with the sample set?"
        message="The sample pipeline, message log, and three resumes will overwrite what is currently stored. Export a backup first if you want it back."
        confirmLabel="Load sample data"
        onCancel={() => setDemoOpen(false)}
        onConfirm={() => {
          loadDemoData();
          setDemoOpen(false);
          toast("Sample data loaded");
        }}
      />

      <ConfirmDialog
        open={resetOpen}
        title="Delete everything?"
        message="Every application, message, reminder, and resume in this browser will be removed. This cannot be undone."
        confirmLabel="Delete everything"
        onCancel={() => setResetOpen(false)}
        onConfirm={() => {
          resetAll();
          setResetOpen(false);
          toast("All data deleted", "info");
        }}
      />
    </>
  );
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}
