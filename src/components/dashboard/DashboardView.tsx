"use client";

import { Sparkles } from "lucide-react";
import { useMemo } from "react";

import { QuickAddButton } from "@/components/applications/QuickAddButton";
import { UploadResumeButton } from "@/components/resumes/UploadResumeDialog";
import { HydrationGate } from "@/components/layout/HydrationGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/components/ui/Toaster";
import {
  buildActivityFeed,
  computeMomentum,
  computePipelineStats,
  findNudges,
  findUpcomingReminders,
} from "@/lib/stats";
import { useAppStore } from "@/store/useAppStore";

import { ActivityFeed } from "./ActivityFeed";
import { FollowUpQueue } from "./FollowUpQueue";
import { FunnelCard } from "./FunnelCard";
import { MomentumCard } from "./MomentumCard";

export function DashboardView() {
  return (
    <HydrationGate>
      <DashboardInner />
    </HydrationGate>
  );
}

function DashboardInner() {
  const applications = useAppStore((state) => state.applications);
  const communications = useAppStore((state) => state.communications);
  const reminders = useAppStore((state) => state.reminders);
  const resumes = useAppStore((state) => state.resumes);
  const settings = useAppStore((state) => state.settings);
  const loadDemoData = useAppStore((state) => state.loadDemoData);

  const stats = useMemo(
    () => computePipelineStats(applications, communications),
    [applications, communications],
  );
  const momentum = useMemo(
    () => computeMomentum(applications, communications, settings.weeklyGoal),
    [applications, communications, settings.weeklyGoal],
  );
  const nudges = useMemo(
    () => findNudges(applications, communications, settings.followUpAfterDays),
    [applications, communications, settings.followUpAfterDays],
  );
  const upcomingReminders = useMemo(
    () => findUpcomingReminders(reminders, applications),
    [reminders, applications],
  );
  const activity = useMemo(
    () => buildActivityFeed(applications, communications),
    [applications, communications],
  );

  if (applications.length === 0 && resumes.length === 0) {
    return (
      <>
        <PageHeader
          eyebrow="ApplyPath"
          title="Let's get you organised"
          description="Track every application, keep one master resume, and never lose a reply. Everything is stored in this browser — no account needed."
        />
        <EmptyState
          icon={<Sparkles size={20} aria-hidden="true" />}
          title="Two ways to start"
          description="Add the first role you are chasing, or load the sample data to look around a populated pipeline first."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <QuickAddButton label="Add an application" />
              <Button
                variant="secondary"
                onClick={() => {
                  loadDemoData();
                  toast("Sample data loaded");
                }}
              >
                Load sample data
              </Button>
              <UploadResumeButton variant="ghost" label="Upload a resume" />
              <ButtonLink href="/resumes" variant="ghost">
                Build a master resume
              </ButtonLink>
            </div>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={greeting(settings.ownerName)}
        title="Dashboard"
        actions={<QuickAddButton />}
      />

      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <FollowUpQueue nudges={nudges} reminders={upcomingReminders} />
          </div>
          <FunnelCard stats={stats} />
        </div>

        <MomentumCard momentum={momentum} />

        <ActivityFeed entries={activity} />
      </div>
    </>
  );
}

function greeting(name: string): string {
  const hour = new Date().getHours();
  const part =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return name ? `${part}, ${name.split(" ")[0]}` : part;
}
