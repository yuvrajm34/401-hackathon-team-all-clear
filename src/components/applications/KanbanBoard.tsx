"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useState } from "react";

import { cn } from "@/lib/cn";
import { STAGE_META } from "@/lib/stages";
import { STAGES, type Application, type Stage } from "@/lib/types";

import {
  ApplicationCard,
  ApplicationCardPreview,
  type ApplicationCardMeta,
} from "./ApplicationCard";

export function KanbanBoard({
  applications,
  metaFor,
  onMove,
}: {
  applications: Application[];
  metaFor: (application: Application) => ApplicationCardMeta;
  onMove: (id: string, stage: Stage) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // A small distance threshold keeps card clicks working while still allowing
  // drag from anywhere on the handle.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const dragging = applications.find((a) => a.id === draggingId);

  const nameFor = (id: string) =>
    applications.find((a) => a.id === id)?.company ?? "selected";

  const handleDragStart = (event: DragStartEvent) => {
    setDraggingId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingId(null);
    const overId = event.over?.id;
    if (!overId) return;

    const stage = String(overId) as Stage;
    if (!STAGES.includes(stage)) return;

    onMove(String(event.active.id), stage);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDraggingId(null)}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) =>
            `Picked up the ${nameFor(String(active.id))} application.`,
          onDragOver: ({ over }) =>
            over
              ? `Now over ${STAGE_META[over.id as Stage]?.label ?? over.id}.`
              : "No longer over a stage.",
          onDragEnd: ({ over }) =>
            over
              ? `Moved to ${STAGE_META[over.id as Stage]?.label ?? over.id}.`
              : "Move cancelled.",
          onDragCancel: () => "Move cancelled.",
        },
      }}
    >
      <div className="scrollbar-slim -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:snap-none sm:px-0">
        {STAGES.map((stage) => (
          <StageColumn
            key={stage}
            stage={stage}
            applications={applications.filter((a) => a.stage === stage)}
            metaFor={metaFor}
            onMove={onMove}
            isDragging={draggingId !== null}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {dragging ? (
          <div className="w-[17rem] cursor-grabbing opacity-95">
            <ApplicationCardPreview
              application={dragging}
              meta={metaFor(dragging)}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function StageColumn({
  stage,
  applications,
  metaFor,
  onMove,
  isDragging,
}: {
  stage: Stage;
  applications: Application[];
  metaFor: (application: Application) => ApplicationCardMeta;
  onMove: (id: string, stage: Stage) => void;
  isDragging: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const meta = STAGE_META[stage];

  return (
    <section
      ref={setNodeRef}
      aria-label={`${meta.label}, ${applications.length} applications`}
      className={cn(
        "flex w-[17.5rem] shrink-0 snap-start flex-col rounded-xl border bg-canvas-accent/40 transition sm:w-auto sm:flex-1 sm:snap-align-none",
        isOver
          ? "border-brand bg-brand-soft/50 ring-2 ring-brand/25"
          : "border-line",
      )}
    >
      <header className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <span
            className={cn("h-2 w-2 rounded-full", meta.dot)}
            aria-hidden="true"
          />
          <h2 className={cn("text-xs font-semibold uppercase tracking-wide", meta.accent)}>
            {meta.label}
          </h2>
        </div>
        <span className="rounded-full bg-surface px-1.5 py-0.5 text-[11px] font-medium text-ink-muted">
          {applications.length}
        </span>
      </header>

      <div className="scrollbar-slim flex min-h-[8rem] flex-1 flex-col gap-2 px-2 pb-2 sm:max-h-[calc(100dvh-16rem)] sm:overflow-y-auto">
        {applications.map((application) => (
          <ApplicationCard
            key={application.id}
            application={application}
            meta={metaFor(application)}
            onMove={(next) => onMove(application.id, next)}
          />
        ))}

        {applications.length === 0 ? (
          <p
            className={cn(
              "rounded-lg border border-dashed px-3 py-6 text-center text-[11px] leading-relaxed transition",
              isDragging
                ? "border-brand/50 text-brand"
                : "border-line-strong text-ink-subtle",
            )}
          >
            {isDragging ? `Drop to mark as ${meta.label}` : meta.hint}
          </p>
        ) : null}
      </div>
    </section>
  );
}
