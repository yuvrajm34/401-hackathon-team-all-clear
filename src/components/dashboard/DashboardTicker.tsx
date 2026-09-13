"use client";

import { useMemo } from "react";

import { scoreListings } from "@/lib/jobs/scoreListings";
import { useJobSearch } from "@/lib/jobs/useJobSearch";
import { resumeText } from "@/lib/resume";
import { selectMasterResume, useAppStore } from "@/store/useAppStore";

import { MarketTicker } from "./MarketTicker";

/** Second surface for Discover's scored listings — no extra data source. */
export function DashboardTicker() {
  const master = useAppStore(selectMasterResume);
  const { data } = useJobSearch("");

  const masterText = useMemo(() => (master ? resumeText(master) : ""), [master]);

  const items = useMemo(
    () =>
      scoreListings(data?.jobs ?? [], masterText).map(({ listing, score }) => ({
        id: listing.id,
        company: listing.company,
        position: listing.position,
        score,
      })),
    [data, masterText],
  );

  return <MarketTicker items={items} />;
}
