"use client";

import { Copy, Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { toast } from "@/components/ui/Toaster";
import { addDays, daysSince, formatRelativeDay, todayIso } from "@/lib/dates";
import { copyToClipboard } from "@/lib/download";
import type { Application, Communication } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

/**
 * Suggests the next action for an application that has gone quiet, and drafts
 * the email so following up is a copy-paste instead of a writing task.
 */
export function FollowUpCard({
  application,
  communications,
  ownerName,
}: {
  application: Application;
  communications: Communication[];
  ownerName: string;
}) {
  const updateApplication = useAppStore((state) => state.updateApplication);
  const followUpAfterDays = useAppStore(
    (state) => state.settings.followUpAfterDays,
  );
  const [draftVisible, setDraftVisible] = useState(false);

  const hasReply = communications.some((c) => c.direction === "inbound");
  const waitingDays = application.dateApplied
    ? daysSince(application.dateApplied)
    : 0;
  const today = todayIso();

  const followUpDue = Boolean(
    application.followUpDate && application.followUpDate <= today,
  );
  const quiet = !hasReply && waitingDays >= followUpAfterDays;

  if (application.stage === "rejected" || application.stage === "offer") {
    return null;
  }
  if (!followUpDue && !quiet) return null;

  const draft = buildFollowUpEmail({ application, ownerName, waitingDays });

  return (
    <Panel className="border-accent/40 bg-accent-soft/40">
      <PanelHeader
        title={
          <span className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-accent" aria-hidden="true" />
            Time for a nudge
          </span>
        }
        description={
          followUpDue
            ? `You planned to follow up ${formatRelativeDay(application.followUpDate)}.`
            : `Sent ${waitingDays} days ago with no reply logged.`
        }
        className="border-accent/30"
      />
      <PanelBody className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setDraftVisible((value) => !value)}
          >
            {draftVisible ? "Hide draft" : "Draft a follow-up email"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              updateApplication(application.id, {
                followUpDate: addDays(today, 7),
              });
              toast("Follow-up pushed out a week", "info");
            }}
          >
            Remind me in a week
          </Button>
          {application.followUpDate ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                updateApplication(application.id, { followUpDate: "" });
                toast("Follow-up cleared", "info");
              }}
            >
              Clear follow-up
            </Button>
          ) : null}
        </div>

        {draftVisible ? (
          <div className="space-y-2">
            <pre className="scrollbar-slim max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-surface p-3 font-sans text-xs leading-relaxed text-ink">
              {draft}
            </pre>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                const copied = await copyToClipboard(draft);
                toast(
                  copied ? "Draft copied to clipboard" : "Could not access the clipboard",
                  copied ? "success" : "warning",
                );
              }}
            >
              <Copy size={14} aria-hidden="true" />
              Copy draft
            </Button>
          </div>
        ) : null}
      </PanelBody>
    </Panel>
  );
}

function buildFollowUpEmail({
  application,
  ownerName,
  waitingDays,
}: {
  application: Application;
  ownerName: string;
  waitingDays: number;
}): string {
  const weeks = Math.max(1, Math.round(waitingDays / 7));
  const timeframe = weeks === 1 ? "about a week" : `about ${weeks} weeks`;
  const signature = ownerName || "[Your name]";

  if (application.stage === "interview") {
    return `Subject: Following up — ${application.position}

Hi [Name],

Thank you again for the conversation about the ${application.position} role at ${application.company}. I enjoyed hearing how the team works and came away more interested than when we started.

I wanted to check in on where things stand and whether there is anything else useful I can send over.

Best,
${signature}`;
  }

  return `Subject: Following up on my ${application.position} application

Hi [Name],

I applied for the ${application.position} role at ${application.company} ${timeframe} ago and wanted to follow up briefly in case my application is still under review.

I remain very interested — the work your team is doing lines up closely with what I want to build next, and I would welcome the chance to talk through how I could contribute.

Happy to resend my resume or answer any questions.

Best,
${signature}`;
}
