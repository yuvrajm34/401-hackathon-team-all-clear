import type { Metadata } from "next";

import { DiscoverView } from "@/components/discover/DiscoverView";

export const metadata: Metadata = {
  title: "Discover Jobs",
  description:
    "Search live openings from company job boards and score them against your resume.",
};

export default function DiscoverPage() {
  return <DiscoverView />;
}
