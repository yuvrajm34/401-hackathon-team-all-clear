"use client";

import { useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import CountUp from "react-countup";

import { Panel, PanelBody } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";

export interface StatDefinition {
  label: string;
  value: string;
  /** When set, numerals count up from 0 on mount. `value` is the static fallback. */
  count?: number;
  suffix?: string;
  hint?: string;
  href?: string;
  icon?: ReactNode;
  tone?: "default" | "positive" | "accent" | "brand";
  rank?: "lead" | "normal" | "quiet";
}

export function StatGrid({ stats }: { stats: StatDefinition[] }) {
  const reduceMotion = useReducedMotion();
  const previous = useRef<Record<string, number>>({});
  const [flashLabel, setFlashLabel] = useState<string | null>(null);

  useEffect(() => {
    let leadChanged: string | null = null;
    for (const stat of stats) {
      if (stat.count == null) continue;
      const last = previous.current[stat.label];
      if (
        last != null &&
        last !== stat.count &&
        (stat.rank ?? "normal") === "lead"
      ) {
        leadChanged = stat.label;
      }
      previous.current[stat.label] = stat.count;
    }
    if (!leadChanged) return;
    setFlashLabel(leadChanged);
    const timer = window.setTimeout(() => setFlashLabel(null), 450);
    return () => window.clearTimeout(timer);
  }, [stats]);

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((stat) => {
        const rank = stat.rank ?? "normal";
        const last = previous.current[stat.label];
        const start =
          stat.count == null
            ? 0
            : last != null && last !== stat.count
              ? last
              : 0;
        const lead = rank === "lead";
        const body = (
          <PanelBody className="py-4">
            <dt
              className={cn(
                "text-[11px] font-medium tracking-wide",
                lead ? "text-brand-on-soft/75" : "text-accent-on-soft/70",
              )}
            >
              {stat.label}
            </dt>
            <dd
              className={cn(
                "font-numeral mt-1",
                lead && "text-[28px] font-semibold leading-9 text-brand-on-soft",
                rank === "normal" && "text-xl font-semibold text-accent-on-soft",
                rank === "quiet" && "text-[15px] font-semibold text-accent-on-soft",
                stat.tone === "positive" && !lead && "text-positive",
              )}
            >
              {stat.count != null && !reduceMotion ? (
                <CountUp
                  key={`${stat.label}-${stat.count}`}
                  start={start}
                  end={stat.count}
                  duration={lead ? 0.7 : 0.45}
                  useEasing
                  suffix={stat.suffix ?? ""}
                />
              ) : (
                stat.value
              )}
            </dd>
            {stat.hint ? (
              <p
                className={cn(
                  "mt-1 text-[11px] leading-4",
                  lead ? "text-brand-on-soft/65" : "text-accent-on-soft/60",
                )}
              >
                {stat.hint}
              </p>
            ) : null}
          </PanelBody>
        );

        const panelClass = cn(
          lead ? "!bg-brand-soft" : "!bg-accent-soft",
          flashLabel === stat.label && "animate-lead-flash",
        );

        return stat.href ? (
          <Panel key={stat.label} as="div" className={panelClass}>
            <Link href={stat.href} className="block rounded-[1.75rem]">
              {body}
            </Link>
          </Panel>
        ) : (
          <Panel key={stat.label} as="div" className={panelClass}>
            {body}
          </Panel>
        );
      })}
    </dl>
  );
}
