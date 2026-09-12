"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface StatDefinition {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  icon?: ReactNode;
  tone?: "default" | "positive" | "accent" | "brand";
}

const TONES = {
  default: "text-ink",
  positive: "text-positive",
  accent: "text-accent",
  brand: "text-brand",
} as const;

export function StatGrid({ stats }: { stats: StatDefinition[] }) {
  return (
    <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((stat) => {
        const body = (
          <>
            <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-subtle">
              {stat.icon}
              {stat.label}
            </dt>
            <dd
              className={cn(
                "mt-1.5 text-2xl font-semibold tabular-nums",
                TONES[stat.tone ?? "default"],
              )}
            >
              {stat.value}
            </dd>
            {stat.hint ? (
              <p className="mt-0.5 text-[11px] text-ink-subtle">{stat.hint}</p>
            ) : null}
          </>
        );

        const className =
          "block rounded-xl border border-line bg-surface px-3.5 py-3 shadow-card transition";

        return stat.href ? (
          <Link
            key={stat.label}
            href={stat.href}
            className={cn(className, "hover:border-brand/60")}
          >
            {body}
          </Link>
        ) : (
          <div key={stat.label} className={className}>
            {body}
          </div>
        );
      })}
    </dl>
  );
}
