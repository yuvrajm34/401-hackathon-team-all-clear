"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { useHydrated } from "@/store/useHydrated";

/**
 * Renders a skeleton until localStorage has been read. Without this the server
 * HTML (which has no data) would not match the first client render.
 */
export function HydrationGate({
  children,
  skeleton,
}: {
  children: ReactNode;
  skeleton?: ReactNode;
}) {
  const hydrated = useHydrated();

  if (!hydrated) {
    return <>{skeleton ?? <DefaultSkeleton />}</>;
  }

  return <>{children}</>;
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-lg bg-surface-muted motion-reduce:animate-none",
        className,
      )}
    />
  );
}

function DefaultSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading your data">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
