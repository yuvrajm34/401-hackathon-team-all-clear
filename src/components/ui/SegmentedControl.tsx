"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface Segment<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full bg-surface-muted p-1",
        className,
      )}
    >
      {segments.map((segment) => {
        const active = segment.value === value;
        return (
          <button
            key={segment.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(segment.value)}
            className={cn(
              "relative inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium",
              active ? "text-ink" : "text-ink-muted hover:text-ink",
            )}
          >
            {active ? (
              <motion.span
                layoutId={reduceMotion ? undefined : `${ariaLabel}-thumb`}
                className="absolute inset-0 rounded-full bg-surface shadow-card"
                transition={{
                  duration: reduceMotion ? 0 : 0.35,
                  ease: [0.2, 0, 0, 1],
                }}
              />
            ) : null}
            <span className="relative z-10 flex items-center gap-1.5">
              {segment.icon}
              <span>{segment.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
