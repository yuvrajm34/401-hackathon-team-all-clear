"use client";

import { ArrowDown, ArrowUp, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { cn } from "@/lib/cn";
import { formatShortDate } from "@/lib/dates";
import { PRIORITY_LABELS, stageIndex } from "@/lib/stages";
import type { Application, Stage } from "@/lib/types";

import { StageSelect } from "./StageBadge";

type SortKey = "company" | "position" | "stage" | "dateApplied" | "priority";

const COLUMNS: {
  key: SortKey;
  label: string;
  className?: string;
}[] = [
  { key: "company", label: "Company" },
  { key: "position", label: "Role", className: "hidden sm:table-cell" },
  { key: "stage", label: "Stage" },
  { key: "dateApplied", label: "Applied", className: "hidden md:table-cell" },
  { key: "priority", label: "Priority", className: "hidden lg:table-cell" },
];

export function ApplicationsTable({
  applications,
  onMove,
  messageCountFor,
}: {
  applications: Application[];
  onMove: (id: string, stage: Stage) => void;
  messageCountFor: (id: string) => number;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("dateApplied");
  const [ascending, setAscending] = useState(false);

  const sorted = useMemo(() => {
    const rows = [...applications];

    rows.sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case "company":
          comparison = a.company.localeCompare(b.company);
          break;
        case "position":
          comparison = a.position.localeCompare(b.position);
          break;
        case "stage":
          comparison = stageIndex(a.stage) - stageIndex(b.stage);
          break;
        case "priority":
          comparison = a.priority - b.priority;
          break;
        case "dateApplied":
        default:
          // Undated wishlist rows sort last regardless of direction.
          if (!a.dateApplied && !b.dateApplied) comparison = 0;
          else if (!a.dateApplied) return 1;
          else if (!b.dateApplied) return -1;
          else comparison = a.dateApplied.localeCompare(b.dateApplied);
          break;
      }
      return ascending ? comparison : -comparison;
    });

    return rows;
  }, [applications, sortKey, ascending]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setAscending((value) => !value);
    } else {
      setSortKey(key);
      setAscending(key === "company" || key === "position");
    }
  };

  return (
    <div className="overflow-hidden rounded-[1.75rem] bg-surface shadow-card">
      <div className="scrollbar-slim overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            Job applications, sortable by column
          </caption>
          <thead>
            <tr className="border-b border-line bg-surface-muted/60 text-left">
              {COLUMNS.map((column) => {
                const active = sortKey === column.key;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={
                      active
                        ? ascending
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                    className={cn(
                      "px-3 py-2 text-xs font-medium text-ink-muted",
                      column.className,
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className="inline-flex items-center gap-1 rounded transition hover:text-ink"
                    >
                      {column.label}
                      {active ? (
                        ascending ? (
                          <ArrowUp size={12} aria-hidden="true" />
                        ) : (
                          <ArrowDown size={12} aria-hidden="true" />
                        )
                      ) : null}
                    </button>
                  </th>
                );
              })}
              <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-ink-muted">
                <span className="sr-only">Actions</span>
                Link
              </th>
            </tr>
          </thead>

          <tbody>
            {sorted.map((application) => (
              <tr
                key={application.id}
                className="border-b border-line last:border-0 transition hover:bg-surface-muted/50"
              >
                <td className="px-3 py-2.5">
                  <Link
                    href={`/applications/${application.id}`}
                    className="font-medium text-ink hover:text-brand"
                  >
                    {application.company}
                  </Link>
                  <p className="text-xs text-ink-subtle sm:hidden">
                    {application.position}
                  </p>
                  {messageCountFor(application.id) > 0 ? (
                    <p className="mt-0.5 text-[11px] text-ink-subtle">
                      {messageCountFor(application.id)} logged message
                      {messageCountFor(application.id) === 1 ? "" : "s"}
                    </p>
                  ) : null}
                </td>

                <td className="hidden px-3 py-2.5 text-ink-muted sm:table-cell">
                  {application.position}
                  {application.location ? (
                    <span className="block text-xs text-ink-subtle">
                      {application.location}
                    </span>
                  ) : null}
                </td>

                <td className="px-3 py-2.5">
                  <StageSelect
                    value={application.stage}
                    ariaLabel={`Stage for ${application.company}`}
                    onChange={(stage) => onMove(application.id, stage)}
                  />
                </td>

                <td className="hidden px-3 py-2.5 text-ink-muted md:table-cell">
                  {application.dateApplied
                    ? formatShortDate(application.dateApplied)
                    : "—"}
                </td>

                <td className="hidden px-3 py-2.5 text-ink-muted lg:table-cell">
                  {PRIORITY_LABELS[application.priority]}
                </td>

                <td className="px-3 py-2.5 text-right">
                  {application.url ? (
                    <a
                      href={application.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={`Open the ${application.company} posting in a new tab`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-subtle transition hover:bg-surface-muted hover:text-brand"
                    >
                      <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="text-xs text-ink-subtle">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
