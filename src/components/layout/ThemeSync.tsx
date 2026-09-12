"use client";

import { useEffect } from "react";

import { useAppStore } from "@/store/useAppStore";

/**
 * Keeps `data-theme` in sync with the stored preference. The initial value is
 * already set by the inline script in the root layout; this only reacts to
 * later changes (user toggling, or the OS flipping while "system" is active).
 */
export function ThemeSync() {
  const theme = useAppStore((state) => state.settings.theme);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && media.matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
    };

    apply();

    if (theme !== "system") return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  return null;
}
