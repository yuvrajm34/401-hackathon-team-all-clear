"use client";

import { motion, useReducedMotion } from "framer-motion";

import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import type { PipelineStats } from "@/lib/stats";

export function FunnelCard({ stats }: { stats: PipelineStats }) {
  const reduceMotion = useReducedMotion();
  const early = stats.submitted < 8;
  const line = stats.funnel
    .map((step) => `${step.count} ${step.label.toLowerCase()}`)
    .join(" · ");

  return (
    <Panel>
      <PanelHeader
        title="Conversion"
        description={
          stats.submitted === 0
            ? "Send your first application to start a count."
            : early
              ? "Rates wait until you have more sent."
              : `Of ${stats.submitted} submitted applications.`
        }
      />
      <PanelBody className="space-y-3">
        {stats.submitted === 0 ? (
          <p className="text-[13px] text-ink-muted">Nothing submitted yet.</p>
        ) : (
          <>
            <p className="font-numeral text-[13px] leading-relaxed text-ink">
              {line}
            </p>
            <ol className="space-y-2">
              {stats.funnel.map((step) => {
                const width =
                  stats.submitted === 0
                    ? 0
                    : Math.round((step.count / stats.submitted) * 100);

                return (
                  <li key={step.stage}>
                    <div className="mb-1 flex items-baseline justify-between gap-3 text-[11px]">
                      <span className="text-ink-muted">{step.label}</span>
                      <span className="font-numeral text-ink">{step.count}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-surface-muted">
                      <motion.div
                        className="h-full rounded-full bg-brand"
                        initial={reduceMotion ? false : { width: 0 }}
                        animate={{ width: `${width}%` }}
                        transition={{
                          duration: 0.6,
                          ease: [0.05, 0.7, 0.1, 1],
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        )}

        <dl className="grid grid-cols-2 gap-4 border-t border-line pt-3 text-[13px]">
          <div>
            <dt className="text-[11px] text-ink-muted">Heard back from</dt>
            <dd className="font-numeral mt-1 text-ink">
              {stats.responded} of {stats.submitted}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-ink-muted">Still open</dt>
            <dd className="font-numeral mt-1 text-ink">
              {stats.byStage.applied + stats.byStage.interview}
            </dd>
          </div>
        </dl>
      </PanelBody>
    </Panel>
  );
}
