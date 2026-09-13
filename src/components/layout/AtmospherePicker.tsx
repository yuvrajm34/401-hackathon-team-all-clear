"use client";

import { ImagePlus } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { toast } from "@/components/ui/Toaster";
import { readAtmosphereImage } from "@/lib/atmosphere-image";
import { cn } from "@/lib/cn";
import type { AtmospherePreference } from "@/lib/types";
import { DEFAULT_SETTINGS, useAppStore } from "@/store/useAppStore";
import { useHydrated } from "@/store/useHydrated";

const OPTIONS: {
  value: AtmospherePreference;
  label: string;
  hint: string;
}[] = [
  { value: "terminal", label: "Quiet", hint: "Tonal surfaces" },
  { value: "apple", label: "Wash", hint: "Soft color field" },
  { value: "image", label: "Image", hint: "Your photo" },
];

export function AtmospherePicker() {
  const stored = useAppStore((state) => state.settings.atmosphere);
  const storedImage = useAppStore((state) => state.settings.atmosphereImage);
  const storedDim = useAppStore((state) => state.settings.atmosphereDim);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const hydrated = useHydrated();
  const atmosphere = hydrated ? stored : DEFAULT_SETTINGS.atmosphere;
  const atmosphereImage = hydrated
    ? storedImage
    : DEFAULT_SETTINGS.atmosphereImage;
  const atmosphereDim = hydrated ? storedDim : DEFAULT_SETTINGS.atmosphereDim;

  const fileRef = useRef<HTMLInputElement>(null);
  const [urlDraft, setUrlDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const applyImage = (value: string) => {
    updateSettings({ atmosphere: "image", atmosphereImage: value });
  };

  return (
    <div className="space-y-3">
      <div
        role="radiogroup"
        aria-label="Atmosphere"
        className="grid grid-cols-3 gap-2"
      >
        {OPTIONS.map((option) => {
          const active = atmosphere === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => updateSettings({ atmosphere: option.value })}
              className={cn(
                "overflow-hidden rounded-2xl text-left shadow-card transition-[box-shadow,transform] duration-200",
                active
                  ? "ring-2 ring-brand"
                  : "hover:shadow-raised",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "block h-14",
                  option.value === "terminal" && "atmosphere-swatch-terminal",
                  option.value === "apple" && "atmosphere-swatch-apple",
                  option.value === "image" && "atmosphere-swatch-image",
                )}
                style={
                  option.value === "image" && atmosphereImage
                    ? {
                        backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.35), transparent), url(${JSON.stringify(atmosphereImage)})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : undefined
                }
              />
              <span className="block px-2 py-2">
                <span className="block text-[13px] font-medium text-ink">
                  {option.label}
                </span>
                <span className="block text-[11px] text-ink-muted">
                  {option.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {atmosphere === "image" ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <TextInput
              type="url"
              value={urlDraft}
              onChange={(event) => setUrlDraft(event.target.value)}
              placeholder="https://… image URL"
              aria-label="Background image URL"
              className="min-w-0 flex-1"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={!urlDraft.trim()}
              onClick={() => {
                applyImage(urlDraft.trim());
                toast("Background image set");
              }}
            >
              Use URL
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                setBusy(true);
                try {
                  applyImage(await readAtmosphereImage(file));
                  setUrlDraft("");
                  toast("Background image added");
                } catch {
                  toast("Could not read that image", "warning");
                } finally {
                  setBusy(false);
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus size={14} aria-hidden="true" />
              {busy ? "Reading…" : "Upload photo"}
            </Button>
            {atmosphereImage ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  applyImage("");
                  setUrlDraft("");
                  toast("Background image cleared");
                }}
              >
                Remove
              </Button>
            ) : null}
          </div>

          <label className="block space-y-1.5">
            <span className="flex items-center justify-between text-xs font-medium text-ink-muted">
              Dimming
              <span className="font-numeral">{atmosphereDim}</span>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={atmosphereDim}
              aria-label="Image dimming"
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-muted accent-brand"
              onChange={(event) =>
                updateSettings({
                  atmosphereDim: Number(event.target.value),
                })
              }
            />
            <span className="block text-[11px] text-ink-subtle">
              One control. The scrim, chrome, and cards stay put.
            </span>
          </label>
        </div>
      ) : null}
    </div>
  );
}
