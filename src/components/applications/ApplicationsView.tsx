"use client";

import { Inbox, List, SquareKanban } from "lucide-react";
import { useMemo, useState } from "react";

import { HydrationGate } from "@/components/layout/HydrationGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { toast } from "@/components/ui/Toaster";
import { cn } from "@/lib/cn";
import { todayIso } from "@/lib/dates";
import { hasMemeForStage } from "@/lib/memes";
import { STAGE_META } from "@/lib/stages";
import { STAGES, type Application, type Stage } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

import type { ApplicationCardMeta } from "./ApplicationCard";
import { ApplicationsTable } from "./ApplicationsTable";
import { KanbanBoard } from "./KanbanBoard";
import { MemePopup, type MemeEvent } from "./MemePopup";
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
  const [stageFilter, setStageFilter] = useState<Stage | "all">("all");
  const [memeEvent, setMemeEvent] = useState<MemeEvent | null>(null);

  const filtered = useMemo(() => {
    if (stageFilter === "all") return applications;
    return applications.filter((application) => application.stage === stageFilter);
  }, [applications, stageFilter]);

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

  // Only the drag-to-move interaction on the board triggers a meme — moving
  // an application by picking a stage from the table's dropdown doesn't.
  // Also skipped for a drop back into the same column it was already in,
  // since nothing actually changed.
  const handleBoardMove = (id: string, stage: Stage) => {
    const application = applications.find((a) => a.id === id);
    const changedStage = Boolean(application) && application!.stage !== stage;
    handleMove(id, stage);
    if (changedStage && hasMemeForStage(stage)) {
      setMemeEvent({ stage, key: Date.now() });
    }
  };

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
          <>
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
            <QuickAddButton size="sm" />
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
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

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Inbox size={20} aria-hidden="true" />}
          title={
            stageFilter === "all"
              ? "Nothing to show"
              : `Nothing in ${STAGE_META[stageFilter].label}`
          }
          description="Move a card here from the board, or pick another stage."
        />
      ) : view === "board" ? (
        <KanbanBoard
          applications={filtered}
          metaFor={metaFor}
          onMove={handleBoardMove}
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

      <MemePopup event={memeEvent} onDone={() => setMemeEvent(null)} />
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
        "chip-tone rounded-full px-2.5 py-1 text-xs font-medium",
        active
          ? "bg-brand-soft text-brand-on-soft"
          : "bg-surface-muted text-ink-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
