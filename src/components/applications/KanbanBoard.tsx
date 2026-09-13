"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  defaultDropAnimationSideEffects,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
} from "@dnd-kit/core";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
  const reduceMotion = useReducedMotion();

  const dropAnimation: DropAnimation | null = reduceMotion
    ? null
    : {
        duration: 320,
        easing: "cubic-bezier(0.05, 0.7, 0.1, 1)",
        sideEffects: defaultDropAnimationSideEffects({
          styles: { active: { opacity: "0" } },
        }),
      };

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
      <div className="scrollbar-slim -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:snap-none sm:px-0">
        {STAGES.map((stage) => (
          <StageColumn
            key={stage}
            stage={stage}
            applications={applications.filter((a) => a.stage === stage)}
            metaFor={metaFor}
            onMove={onMove}
            isDragging={draggingId !== null}
            reduceMotion={Boolean(reduceMotion)}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={dropAnimation}>
        {dragging ? (
          <motion.div
            className="w-[17rem] cursor-grabbing"
            initial={reduceMotion ? false : { scale: 1, rotate: 0 }}
            animate={
              reduceMotion
                ? undefined
                : { scale: 1.03, rotate: 1.5 }
            }
            transition={{ duration: 0.2, ease: [0.3, 0, 0.8, 0.15] }}
          >
            <ApplicationCardPreview
              application={dragging}
              meta={metaFor(dragging)}
            />
          </motion.div>
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
  reduceMotion,
}: {
  stage: Stage;
  applications: Application[];
  metaFor: (application: Application) => ApplicationCardMeta;
  onMove: (id: string, stage: Stage) => void;
  isDragging: boolean;
  reduceMotion: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const meta = STAGE_META[stage];

  return (
    <section
      ref={setNodeRef}
      aria-label={`${meta.label}, ${applications.length} applications`}
      className={cn(
        "flex w-[17.5rem] shrink-0 snap-start flex-col rounded-2xl bg-surface-muted/80 transition-[background-color,box-shadow] duration-200 ease-[var(--ease-emphasized)] sm:w-auto sm:flex-1 sm:snap-align-none",
        isOver && "bg-brand-soft shadow-card",
      )}
    >
      <header className="flex items-center justify-between gap-2 px-3 py-3">
        <div className="flex items-center gap-1.5">
          <span
            className={cn("h-2 w-2 rounded-full", meta.dot)}
            aria-hidden="true"
          />
          <h2 className={cn("text-[13px] font-semibold", meta.accent)}>
            {meta.label}
          </h2>
        </div>
        <span className="font-numeral text-[13px] text-ink-muted">
          {applications.length}
        </span>
      </header>

      <div className="scrollbar-slim flex min-h-[8rem] flex-1 flex-col gap-2 px-2 pb-2 sm:max-h-[calc(100dvh-16rem)] sm:overflow-y-auto">
        <AnimatePresence initial={false}>
          {applications.map((application) => (
            <motion.div
              key={application.id}
              layout={!reduceMotion}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
            >
              <ApplicationCard
                application={application}
                meta={metaFor(application)}
                onMove={(next) => onMove(application.id, next)}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {applications.length === 0 ? (
          <p
            className={cn(
              "rounded-2xl px-3 py-6 text-center text-[11px] leading-relaxed transition-colors duration-200",
              isDragging
                ? "bg-brand-soft text-brand-on-soft"
                : "text-ink-subtle",
            )}
          >
            {isDragging ? `Drop to mark as ${meta.label}` : meta.hint}
          </p>
        ) : null}
      </div>
    </section>
  );
}
