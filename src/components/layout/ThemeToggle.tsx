"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { cn } from "@/lib/cn";
import type { ThemePreference } from "@/lib/types";
import { DEFAULT_SETTINGS, useAppStore } from "@/store/useAppStore";
import { useHydrated } from "@/store/useHydrated";

const OPTIONS: {
  value: ThemePreference;
  label: string;
  icon: typeof Sun;
}[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const storedTheme = useAppStore((state) => state.settings.theme);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const hydrated = useHydrated();

  // This control lives in the app shell, outside any HydrationGate, so it has
  // to fall back to the default until localStorage has been read. Otherwise the
  // server would render "system" while the client renders the saved preference.
  const theme = hydrated ? storedTheme : DEFAULT_SETTINGS.theme;

  if (compact) {
    // Cycles light -> dark -> system to keep the mobile header to one button.
    const index = OPTIONS.findIndex((option) => option.value === theme);
    const current = OPTIONS[index === -1 ? 2 : index];
    const next = OPTIONS[(index + 1) % OPTIONS.length];
    const Icon = current.icon;

    return (
      <button
        type="button"
        onClick={() => updateSettings({ theme: next.value })}
        aria-label={`Theme: ${current.label}. Switch to ${next.label}.`}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-ink-muted transition hover:text-ink"
      >
        <Icon size={16} aria-hidden="true" />
      </button>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="flex items-center gap-0.5 rounded-lg border border-line bg-surface-muted p-0.5"
    >
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.label}
            onClick={() => updateSettings({ theme: option.value })}
            className={cn(
              "flex h-7 flex-1 items-center justify-center rounded-md transition",
              active
                ? "bg-surface text-ink shadow-xs"
                : "text-ink-subtle hover:text-ink",
            )}
          >
            <Icon size={14} aria-hidden="true" />
            <span className="sr-only">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
