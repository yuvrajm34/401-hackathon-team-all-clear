"use client";

import {
  Inbox,
  List,
  Search,
  SquareKanban,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { HydrationGate } from "@/components/layout/HydrationGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { TextInput } from "@/components/ui/Field";
import { toast } from "@/components/ui/Toaster";
import { cn } from "@/lib/cn";
import { todayIso } from "@/lib/dates";
import { STAGE_META } from "@/lib/stages";
import { STAGES, type Application, type Stage } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

import type { ApplicationCardMeta } from "./ApplicationCard";
import { ApplicationsTable } from "./ApplicationsTable";
import { KanbanBoard } from "./KanbanBoard";
import { QuickAddButton } from "./QuickAddButton";

type ViewMode = "board" | "list";

export function ApplicationsView() {
  return (
    <HydrationGate>
      <ApplicationsViewInner />
    </HydrationGate>
  );
}

function ApplicationsViewInner() {
  const applications = useAppStore((state) => state.applications);
  const communications = useAppStore((state) => state.communications);
  const reminders = useAppStore((state) => state.reminders);
  const resumes = useAppStore((state) => state.resumes);
  const moveApplicationToStage = useAppStore(
    (state) => state.moveApplicationToStage,
  );
  const loadDemoData = useAppStore((state) => state.loadDemoData);

  const [view, setView] = useState<ViewMode>("board");
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<Stage | "all">("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const application of applications) {
      for (const tag of application.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([tag]) => tag);
  }, [applications]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return applications.filter((application) => {
      if (stageFilter !== "all" && application.stage !== stageFilter) {
        return false;
      }
      if (tagFilter && !application.tags.includes(tagFilter)) return false;
      if (!needle) return true;

      return [
        application.company,
        application.position,
        application.location,
        application.notes,
        ...application.tags,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [applications, query, stageFilter, tagFilter]);

  const metaFor = (application: Application): ApplicationCardMeta => ({
    messages: communications.filter((c) => c.applicationId === application.id)
      .length,
    reminders: reminders.filter(
      (r) => r.applicationId === application.id && !r.done,
    ).length,
    resumeName: resumes.find((r) => r.id === application.resumeId)?.name,
    followUpDue: Boolean(
      application.followUpDate && application.followUpDate <= todayIso(),
    ),
  });

  const handleMove = (id: string, stage: Stage) => {
    const application = applications.find((a) => a.id === id);
    moveApplicationToStage(id, stage);

    if (stage === "offer" && application) {
      toast(`Offer from ${application.company}. Congratulations.`);
    } else if (application) {
      toast(`${application.company} moved to ${STAGE_META[stage].label}`);
    }
  };

  const filtersActive = query.trim() !== "" || stageFilter !== "all" || tagFilter;

  if (applications.length === 0) {
    return (
      <>
        <PageHeader
          title="Applications"
          description="Every role you are tracking, in one pipeline."
        />
        <EmptyState
          icon={<Inbox size={20} aria-hidden="true" />}
          title="No applications yet"
          description="Add the first role you are chasing, or load the sample data to see how the pipeline works."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <QuickAddButton label="Add your first application" />
              <Button
                variant="secondary"
                onClick={() => {
                  loadDemoData();
                  toast("Sample data loaded");
                }}
              >
                Load sample data
              </Button>
            </div>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Applications"
        description={`${applications.length} tracked · ${
          applications.filter((a) => a.stage !== "wishlist").length
        } submitted`}
        actions={
          <SegmentedControl<ViewMode>
            ariaLabel="Layout"
            value={view}
            onChange={setView}
            segments={[
              {
                value: "board",
                label: "Board",
                icon: <SquareKanban size={14} aria-hidden="true" />,
              },
              {
                value: "list",
                label: "List",
                icon: <List size={14} aria-hidden="true" />,
              },
            ]}
          />
        }
      />

      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search
              size={15}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle"
            />
            <TextInput
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search company, role, notes"
              aria-label="Search applications"
              className="pl-9"
            />
          </div>

          {filtersActive ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuery("");
                setStageFilter("all");
                setTagFilter(null);
              }}
            >
              <X size={14} aria-hidden="true" />
              Clear filters
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <FilterChip
            active={stageFilter === "all"}
            onClick={() => setStageFilter("all")}
          >
            All stages
          </FilterChip>
          {STAGES.map((stage) => (
            <FilterChip
              key={stage}
              active={stageFilter === stage}
              onClick={() => setStageFilter(stage)}
            >
              {STAGE_META[stage].label}
              <span className="ml-1 text-ink-subtle">
                {applications.filter((a) => a.stage === stage).length}
              </span>
            </FilterChip>
          ))}
        </div>

        {allTags.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] uppercase tracking-wide text-ink-subtle">
              Tags
            </span>
            {allTags.map((tag) => (
              <FilterChip
                key={tag}
                active={tagFilter === tag}
                onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
              >
                {tag}
              </FilterChip>
            ))}
          </div>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={20} aria-hidden="true" />}
          title="Nothing matches those filters"
          description="Try a different search term or clear the filters to see the whole pipeline."
        />
      ) : view === "board" ? (
        <KanbanBoard
          applications={filtered}
          metaFor={metaFor}
          onMove={handleMove}
        />
      ) : (
        <ApplicationsTable
          applications={filtered}
          onMove={handleMove}
          messageCountFor={(id) =>
            communications.filter((c) => c.applicationId === id).length
          }
        />
      )}
    </>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-medium transition",
        active
          ? "border-brand bg-brand-soft text-brand-ink"
          : "border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
