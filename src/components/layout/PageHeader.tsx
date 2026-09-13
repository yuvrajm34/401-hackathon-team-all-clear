import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-5 flex flex-wrap items-end justify-between gap-3",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-medium tracking-wide text-ink-muted">{eyebrow}</p>
        ) : null}
        <h1 className="font-display text-balance text-[28px] font-semibold leading-9 text-ink">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-[40rem] text-sm leading-6 text-ink-muted">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
