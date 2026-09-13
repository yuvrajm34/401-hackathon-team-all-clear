import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[1.75rem] bg-surface px-6 py-12 text-center shadow-card",
        className,
      )}
    >
      {icon ? (
        <div className="mb-3 flex h-10 w-10 items-center justify-center text-ink-muted">
          {icon}
        </div>
      ) : null}
      <h3 className="text-[22px] font-semibold leading-7 tracking-tight text-ink">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-[40rem] text-sm leading-6 text-ink-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
