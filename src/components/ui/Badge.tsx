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
    neutral: "bg-surface-muted text-ink-muted ring-line",
    brand: "bg-brand-soft text-brand-ink ring-brand/20",
    accent: "bg-accent-soft text-accent ring-accent/30",
    positive: "bg-positive/10 text-positive ring-positive/25",
    negative: "bg-negative/10 text-negative ring-negative/25",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
