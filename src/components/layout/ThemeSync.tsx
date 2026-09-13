"use client";

import { useEffect } from "react";

import { atmosphereImageCss } from "@/lib/atmosphere-image";
import type { AtmospherePreference } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

function isAtmosphere(value: unknown): value is AtmospherePreference {
  return value === "terminal" || value === "apple" || value === "image";
}

function clampDim(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 55;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/**
 * Keeps theme, atmosphere, and the photo CSS variables in sync. The initial
 * values are already set by the inline script in the root layout.
 */
export function ThemeSync() {
  const theme = useAppStore((state) => state.settings.theme);
  const atmosphere = useAppStore((state) => state.settings.atmosphere);
  const atmosphereImage = useAppStore((state) => state.settings.atmosphereImage);
  const atmosphereDim = useAppStore((state) => state.settings.atmosphereDim);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && media.matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      document.documentElement.dataset.atmosphere = isAtmosphere(atmosphere)
        ? atmosphere
        : "apple";

      document.documentElement.style.setProperty(
        "--atmosphere-dim",
        String(clampDim(atmosphereDim) / 100),
      );

      const image = atmosphereImage?.trim();
      if (atmosphere === "image" && image) {
        document.documentElement.style.setProperty(
          "--atmosphere-image",
          atmosphereImageCss(image),
        );
      } else {
        document.documentElement.style.removeProperty("--atmosphere-image");
      }
    };

    apply();

    if (theme !== "system") return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme, atmosphere, atmosphereImage, atmosphereDim]);

  return null;
}
