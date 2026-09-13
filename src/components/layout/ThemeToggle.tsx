"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";
import { DEFAULT_SETTINGS, useAppStore } from "@/store/useAppStore";
import { useHydrated } from "@/store/useHydrated";

function prefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function ThemeToggle() {
  const storedTheme = useAppStore((state) => state.settings.theme);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const hydrated = useHydrated();
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setSystemDark(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const theme = hydrated ? storedTheme : DEFAULT_SETTINGS.theme;
  const isDark =
    theme === "dark" || (theme === "system" && (hydrated ? systemDark : prefersDark()));

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="flex items-center gap-0.5 rounded-full bg-surface/90 p-1 shadow-card backdrop-blur-xl"
    >
      <button
        type="button"
        role="radio"
        aria-checked={!isDark}
        title="Light"
        onClick={() => updateSettings({ theme: "light" })}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full transition",
          !isDark
            ? "bg-surface text-ink shadow-card"
            : "text-ink-subtle hover:text-ink",
        )}
      >
        <Sun size={14} aria-hidden="true" />
        <span className="sr-only">Light</span>
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={isDark}
        title="Dark"
        onClick={() => updateSettings({ theme: "dark" })}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full transition",
          isDark
            ? "bg-surface text-ink shadow-card"
            : "text-ink-subtle hover:text-ink",
        )}
      >
        <Moon size={14} aria-hidden="true" />
        <span className="sr-only">Dark</span>
      </button>
    </div>
  );
}
