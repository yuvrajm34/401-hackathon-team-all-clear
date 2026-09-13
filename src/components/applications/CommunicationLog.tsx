"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  MessageSquarePlus,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Field,
  LabeledInput,
  LabeledTextArea,
  Select,
} from "@/components/ui/Field";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { ConfirmDialog, SlideOver } from "@/components/ui/SlideOver";
import { toast } from "@/components/ui/Toaster";
import { cn } from "@/lib/cn";
import { formatDate, todayIso } from "@/lib/dates";
import { CHANNEL_LABELS, OUTCOME_LABELS, STAGE_META } from "@/lib/stages";
import {
  COMMUNICATION_CHANNELS,
  COMMUNICATION_OUTCOMES,
  type Application,
  type Communication,
  type CommunicationChannel,
  type CommunicationDirection,
  type CommunicationOutcome,
} from "@/lib/types";
import { stageForOutcome } from "@/lib/stages";
import { useAppStore } from "@/store/useAppStore";

export function CommunicationLog({
  application,
  communications,
}: {
  application: Application;
  communications: Communication[];
}) {
  const deleteCommunication = useAppStore((state) => state.deleteCommunication);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Communication | null>(null);

  const ordered = [...communications].sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  return (
    <>
      <Panel>
        <PanelHeader
          title="Responses and communication"
          description={
            ordered.length === 0
              ? "Log every email, call, and interview so nothing gets lost."
              : `${ordered.length} entr${ordered.length === 1 ? "y" : "ies"} on record`
          }
          action={
            <Button size="sm" variant="secondary" onClick={() => setFormOpen(true)}>
              <MessageSquarePlus size={14} aria-hidden="true" />
              Log message
            </Button>
          }
        />
        <PanelBody className={ordered.length === 0 ? undefined : "py-3"}>
          {ordered.length === 0 ? (
            <EmptyState
              title="No messages logged"
              description="Recording a reply with an outcome moves the application to the matching stage automatically."
              className="border-0 bg-transparent py-6 shadow-none"
            />
          ) : (
            <ol className="relative space-y-3 border-l-2 border-brand-soft pl-4">
              {ordered.map((message) => (
                <li key={message.id} className="relative">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute -left-[21px] top-2 flex h-3.5 w-3.5 items-center justify-center rounded-full ring-2 ring-surface",
                      message.direction === "inbound"
                        ? "bg-brand"
                        : "bg-ink-subtle",
                    )}
                  />

                  <div className="rounded-2xl bg-surface-muted/60 p-3">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      {message.direction === "inbound" ? (
                        <ArrowDownLeft
                          size={13}
                          className="text-brand"
                          aria-hidden="true"
                        />
                      ) : (
                        <ArrowUpRight
                          size={13}
                          className="text-ink-subtle"
                          aria-hidden="true"
                        />
                      )}
                      <span className="text-xs font-semibold text-ink">
                        {message.subject || CHANNEL_LABELS[message.channel]}
                      </span>
                      <span className="text-[11px] text-ink-subtle">
                        {CHANNEL_LABELS[message.channel]} ·{" "}
                        <span className="font-numeral">
                          {formatDate(message.date)}
                        </span>
                      </span>

                      {message.outcome !== "none" ? (
                        <OutcomeChip outcome={message.outcome} />
                      ) : null}

                      <button
                        type="button"
                        onClick={() => setPendingDelete(message)}
                        aria-label="Delete this log entry"
                        className="ml-auto rounded p-1 text-ink-subtle transition hover:bg-surface hover:text-negative"
                      >
                        <Trash2 size={13} aria-hidden="true" />
                      </button>
                    </div>

                    {message.body ? (
                      <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-ink-muted">
                        {message.body}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </PanelBody>
      </Panel>

      <CommunicationForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        application={application}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete log entry"
        message="This removes the entry from the timeline. The application stage will not change back."
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteCommunication(pendingDelete.id);
          setPendingDelete(null);
          toast("Log entry deleted", "info");
        }}
      />
    </>
  );
}

function OutcomeChip({ outcome }: { outcome: CommunicationOutcome }) {
  const tones: Record<CommunicationOutcome, string> = {
    none: "bg-surface-muted text-ink-muted",
    interview_invite: "bg-positive-soft text-positive",
    offer: "bg-positive-soft text-positive",
    rejection: "bg-negative-soft text-negative",
    info_request: "bg-accent-soft text-accent-on-soft",
  };

  return (
    <span
      className={cn(
        "chip-tone rounded-lg px-1.5 py-0.5 text-[10px] font-medium",
        tones[outcome],
      )}
    >
      {OUTCOME_LABELS[outcome]}
    </span>
  );
}

function CommunicationForm({
  open,
  onClose,
  application,
}: {
  open: boolean;
  onClose: () => void;
  application: Application;
}) {
  const addCommunication = useAppStore((state) => state.addCommunication);

  const [date, setDate] = useState(todayIso());
  const [channel, setChannel] = useState<CommunicationChannel>("email");
  const [direction, setDirection] = useState<CommunicationDirection>("inbound");
  const [outcome, setOutcome] = useState<CommunicationOutcome>("none");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const reset = () => {
    setDate(todayIso());
    setChannel("email");
    setDirection("inbound");
    setOutcome("none");
    setSubject("");
    setBody("");
  };

  const impliedStage = stageForOutcome(outcome);

  const submit = () => {
    addCommunication({
      applicationId: application.id,
      date: date || todayIso(),
      channel,
      direction,
      outcome,
      subject: subject.trim(),
      body: body.trim(),
    });

    toast(
      impliedStage
        ? `Logged. ${application.company} moved to ${STAGE_META[impliedStage].label}.`
        : "Message logged",
    );

    reset();
    onClose();
  };

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title="Log a message"
      description={`${application.company} — ${application.position}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>Save entry</Button>
        </div>
      }
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Field label="Direction">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: "inbound", label: "They contacted me" },
                { value: "outbound", label: "I contacted them" },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDirection(option.value)}
                aria-pressed={direction === option.value}
                className={cn(
                  "chip-tone rounded-xl px-3 py-2 text-xs font-medium",
                  direction === option.value
                    ? "bg-brand-soft text-brand-on-soft"
                    : "bg-surface-muted text-ink-muted hover:text-ink",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <LabeledInput
            label="Date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          <Field label="Channel">
            <Select
              value={channel}
              onChange={(event) =>
                setChannel(event.target.value as CommunicationChannel)
              }
            >
              {COMMUNICATION_CHANNELS.map((value) => (
                <option key={value} value={value}>
                  {CHANNEL_LABELS[value]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label="Outcome"
          hint={
            impliedStage
              ? `Saving will move this application to ${STAGE_META[impliedStage].label}.`
              : "Pick an outcome to update the stage automatically."
          }
        >
          <Select
            value={outcome}
            onChange={(event) =>
              setOutcome(event.target.value as CommunicationOutcome)
            }
          >
            {COMMUNICATION_OUTCOMES.map((value) => (
              <option key={value} value={value}>
                {OUTCOME_LABELS[value]}
              </option>
            ))}
          </Select>
        </Field>

        <LabeledInput
          label="Subject"
          placeholder="Phone screen invitation"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
        />

        <LabeledTextArea
          label="Details"
          rows={6}
          placeholder="Who reached out, what they asked for, and what happens next."
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </form>
    </SlideOver>
  );
}
