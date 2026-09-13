"use client";

import { MailOpen, Send } from "lucide-react";
import Link from "next/link";

import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { formatDate } from "@/lib/dates";
import type { ActivityEntry } from "@/lib/stats";

export function ActivityFeed({ entries }: { entries: ActivityEntry[] }) {
  return (
    <Panel>
      <PanelHeader
        title="Recent activity"
        description="Applications sent and replies logged."
      />
      <PanelBody>
        {entries.length === 0 ? (
          <p className="text-xs text-ink-subtle">
            Nothing yet. Applications and logged messages show up here.
          </p>
        ) : (
          <ol className="space-y-2.5">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-start gap-2.5">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink-muted"
                >
                  {entry.kind === "application" ? (
                    <Send size={11} />
                  ) : (
                    <MailOpen size={11} />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/applications/${entry.applicationId}`}
                    className="block truncate text-xs font-medium text-ink hover:text-brand"
                  >
                    {entry.title}
                  </Link>
                  <p className="truncate text-[11px] text-ink-subtle">
                    {entry.detail} ·{" "}
                    <span className="font-numeral">{formatDate(entry.date)}</span>
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </PanelBody>
    </Panel>
  );
}
