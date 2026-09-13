"use client";

import { ClipboardPaste, FileUp, LoaderCircle, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SlideOver } from "@/components/ui/SlideOver";
import { toast } from "@/components/ui/Toaster";
import {
  parseResumeFileQuick,
  parseResumeSource,
  refineResumeWithAI,
  RESUME_ACCEPT,
  ResumeFileError,
  type ResumeFileQuickResult,
} from "@/lib/resume-file";
import {
  describeParsedResume,
  parsedResumeIsEmpty,
  type ParsedResume,
} from "@/lib/resume-parse";
import { useAppStore } from "@/store/useAppStore";

const EMPTY_MESSAGE =
  "Could not find name, education, or projects in that source. In Overleaf, open the .tex that has those sections, Select All, copy, and paste it here.";

interface UploadResumeDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Unmounted while closed so picking a file always starts from a clean state.
 */
export function UploadResumeDialog(props: UploadResumeDialogProps) {
  if (!props.open) return null;
  return <UploadResumeDialogInner {...props} />;
}

export function UploadResumeButton({
  variant = "secondary",
  size = "md",
  label = "Upload resume",
}: {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        <Upload size={size === "sm" ? 14 : 16} aria-hidden="true" />
        {label}
      </Button>
      <UploadResumeDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function UploadResumeDialogInner({ open, onClose }: UploadResumeDialogProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const applyParsedMaster = useAppStore((state) => state.applyParsedMaster);

  const [mode, setMode] = useState<"file" | "paste">("file");
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState("");
  const [paste, setPaste] = useState("");
  const [error, setError] = useState("");
  const [parsed, setParsed] = useState<ParsedResume | null>(null);

  // Guards so a slow background AI call doesn't set state after the user
  // already applied the quick result, picked a different file, or closed
  // the dialog (component unmounted).
  const appliedRef = useRef(false);
  const requestIdRef = useRef(0);
  const unmountedRef = useRef(false);
  useEffect(() => {
    return () => {
      unmountedRef.current = true;
    };
  }, []);

  const found = parsed ? describeParsedResume(parsed) : [];

  const resetPicker = () => {
    if (inputRef.current) inputRef.current.value = "";
  };

  const takeParsed = (next: ParsedResume, label: string) => {
    if (parsedResumeIsEmpty(next)) {
      setError(EMPTY_MESSAGE);
      return;
    }
    setFileName(label);
    setParsed(next);
  };

  const readFile = async (file: File) => {
    const requestId = ++requestIdRef.current;
    appliedRef.current = false;
    setBusy(true);
    setError("");
    setParsed(null);
    setFileName(file.name);

    let quick: ResumeFileQuickResult;
    try {
      quick = await parseResumeFileQuick(file);
    } catch (caught) {
      const message =
        caught instanceof ResumeFileError
          ? caught.message
          : "Could not read that file.";
      setError(message);
      setBusy(false);
      resetPicker();
      return;
    }

    // Show the fast heuristic result right away — this is deliberately not
    // gated on AI. The regex/positional-layout parser alone handles real
    // resumes well and resolves in well under a second; waiting on a local
    // model (10-30+ seconds, and dependent on Ollama actually running) to
    // show *anything* made the dialog look stuck for no benefit most of
    // the time.
    setBusy(false);
    resetPicker();
    takeParsed(quick.parsed, file.name);

    if (!quick.refineInput) return;

    // If a better AI result arrives later, swap it in silently — but only
    // if this is still the active request, the user hasn't already hit
    // "Use this file", and the dialog is still open.
    const refined = await refineResumeWithAI(quick.refineInput);
    if (
      unmountedRef.current ||
      appliedRef.current ||
      requestId !== requestIdRef.current
    ) {
      return;
    }
    if (refined && !parsedResumeIsEmpty(refined)) {
      setParsed(refined);
      setError("");
    }
  };

  const readPaste = () => {
    appliedRef.current = false;
    ++requestIdRef.current; // invalidate any in-flight file-mode AI refine
    setBusy(true);
    setError("");
    setParsed(null);

    try {
      takeParsed(parseResumeSource(paste), "Pasted Overleaf .tex");
    } catch (caught) {
      const message =
        caught instanceof ResumeFileError
          ? caught.message
          : "Could not read that source.";
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    if (!parsed) return;
    appliedRef.current = true;
    const { id, applied } = applyParsedMaster(parsed);
    const highlight = applied
      .filter((item) =>
        /name|email|phone|linkedin|github|gitlab|portfolio/i.test(item),
      )
      .slice(0, 4);
    toast(
      highlight.length
        ? `Master resume updated · ${highlight.join(", ")}`
        : "Master resume updated from the file",
    );
    onClose();
    router.push(`/resumes/${id}`);
  };

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title="Upload a master resume"
      description="Upload a file, or paste the Overleaf .tex. The review lists every school, project, bullet, and skill group found."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={apply} disabled={!parsed || busy}>
            Use this resume
          </Button>
        </div>
      }
    >
      <SegmentedControl
        ariaLabel="How to add the resume"
        className="mb-4"
        value={mode}
        onChange={(next) => {
          setMode(next);
          setError("");
        }}
        segments={[
          { value: "file", label: "File" },
          { value: "paste", label: "Paste .tex" },
        ]}
      />

      {mode === "file" ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={RESUME_ACCEPT}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void readFile(file);
            }}
          />

          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
            }}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files?.[0];
              if (file) void readFile(file);
            }}
            className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-line-strong bg-surface-muted/50 px-4 py-8 text-center transition hover:border-brand hover:bg-brand-soft/40 disabled:opacity-60"
          >
            {busy ? (
              <LoaderCircle
                size={22}
                className="animate-spin text-brand"
                aria-hidden="true"
              />
            ) : (
              <FileUp size={22} className="text-brand" aria-hidden="true" />
            )}
            <span className="text-sm font-medium text-ink">
              {busy ? "Parsing your resume…" : "Drop a file or browse"}
            </span>
            <span className="text-xs text-ink-subtle">
              .tex, Overleaf zip, .pdf, or .docx
            </span>
          </button>
        </>
      ) : (
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-ink-muted">
              Overleaf source
            </span>
            <TextArea
              rows={12}
              value={paste}
              spellCheck={false}
              disabled={busy}
              onChange={(event) => setPaste(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  readPaste();
                }
              }}
              className="font-mono text-[13px]"
              placeholder={
                "In Overleaf: open the .tex with Education / Projects, Select All, copy, then paste here.\n\n\\documentclass[letterpaper,11pt]{article}\n...\n\\end{document}"
              }
            />
          </label>
          <Button
            type="button"
            variant="secondary"
            disabled={busy || !paste.trim()}
            onClick={readPaste}
          >
            {busy ? (
              <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
            ) : (
              <ClipboardPaste size={14} aria-hidden="true" />
            )}
            Scan pasted .tex
          </Button>
        </div>
      )}

      {fileName ? (
        <p className="mt-3 text-xs text-ink-muted">
          Source: <span className="font-medium text-ink">{fileName}</span>
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-negative">
          {error}
        </p>
      ) : null}

      {parsed && found.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-ink-muted">
            Found in the file
          </p>
          <ul className="max-h-[50vh] space-y-1.5 overflow-x-hidden overflow-y-auto pr-1">
            {found.map((item, index) => (
              <li
                key={`${index}-${item.slice(0, 40)}`}
                className={
                  item.startsWith("  ")
                    ? "rounded-lg bg-surface-muted px-3 py-1.5 text-[13px] leading-snug text-ink-muted"
                    : "rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink"
                }
              >
                {item.trim()}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-ink-subtle">
            Applying this replaces the master with everything found in the
            file. Sections the file does not have (for example Experience) are
            cleared so leftover sample roles do not stay.
          </p>
        </div>
      ) : null}
    </SlideOver>
  );
}
