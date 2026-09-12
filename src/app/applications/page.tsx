import type { Metadata } from "next";

import { ApplicationsView } from "@/components/applications/ApplicationsView";

export const metadata: Metadata = {
  title: "Applications",
  description:
    "Track every job application by stage, from wishlist through offer.",
};

export default function ApplicationsPage() {
  return <ApplicationsView />;
}
