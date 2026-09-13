import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export function Badge({
  children,
  className,
  tone = "neutral",
}: {
  children: ReactNode;
  className?: string;
  tone?: "neutral" | "brand" | "accent" | "positive" | "negative";
}) {
  const tones = {
    neutral: "bg-surface-muted text-ink-muted",
    brand: "bg-brand-soft text-brand-on-soft",
    accent: "bg-accent-soft text-accent-on-soft",
    positive: "bg-positive-soft text-positive",
    negative: "bg-negative-soft text-negative",
  } as const;

  return (
    <span
      className={cn(
        "chip-tone inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
