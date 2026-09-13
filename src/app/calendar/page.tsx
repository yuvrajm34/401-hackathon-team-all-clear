import type { Metadata } from "next";

import { CalendarView } from "@/components/calendar/CalendarView";

export const metadata: Metadata = {
  title: "Calendar",
  description:
    "See interviews, follow-ups, and reminders on one job-search calendar.",
};

export default function CalendarPage() {
  return <CalendarView />;
}
