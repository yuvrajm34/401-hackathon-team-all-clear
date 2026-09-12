import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Circular progress indicator used for the weekly goal and match score.
 * Rendered with SVG so it scales cleanly and prints.
 */
export function ProgressRing({
  value,
  size = 96,
  thickness = 8,
  children,
  className,
  trackClassName,
  indicatorClassName,
  label,
}: {
  /** 0-100. Values outside the range are clamped. */
  value: number;
  size?: number;
  thickness?: number;
  children?: ReactNode;
  className?: string;
  trackClassName?: string;
  indicatorClassName?: string;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped / 100);

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${clamped} percent`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          className={cn("stroke-line", trackClassName)}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className={cn(
            "stroke-brand transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none",
            indicatorClassName,
          )}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}
