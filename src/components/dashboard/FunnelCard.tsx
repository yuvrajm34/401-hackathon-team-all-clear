"use client";

import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import { STAGE_META } from "@/lib/stages";
import type { PipelineStats } from "@/lib/stats";

export function FunnelCard({ stats }: { stats: PipelineStats }) {
  return (
    <Panel>
      <PanelHeader
        title="Conversion funnel"
        description={
          stats.submitted === 0
            ? "Send your first application to start the funnel."
            : `Of ${stats.submitted} submitted applications.`
        }
      />
      <PanelBody className="space-y-3">
        {stats.funnel.map((step) => {
          const meta = STAGE_META[step.stage];
          return (
            <div key={step.stage}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium text-ink">{step.label}</span>
                <span className="text-xs tabular-nums text-ink-muted">
                  {step.count}
                  <span className="ml-1 text-ink-subtle">({step.rate}%)</span>
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-muted">
                <div
                  role="presentation"
                  style={{ width: `${step.rate}%` }}
                  className={cn(
                    "h-full rounded-full transition-[width] duration-700",
                    meta.bar,
                  )}
                />
              </div>
            </div>
          );
        })}

        <dl className="grid grid-cols-2 gap-2 border-t border-line pt-3 text-xs">
          <div>
            <dt className="text-ink-subtle">Heard back from</dt>
            <dd className="mt-0.5 font-semibold tabular-nums text-ink">
              {stats.responded} of {stats.submitted}
              <span className="ml-1 font-normal text-ink-muted">
                ({stats.responseRate}%)
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-ink-subtle">Still open</dt>
            <dd className="mt-0.5 font-semibold tabular-nums text-ink">
              {stats.byStage.applied + stats.byStage.interview}
              <span className="ml-1 font-normal text-ink-muted">
                awaiting a decision
              </span>
            </dd>
          </div>
        </dl>
      </PanelBody>
    </Panel>
  );
}
