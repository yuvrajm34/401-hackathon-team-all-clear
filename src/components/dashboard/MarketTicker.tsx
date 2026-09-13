"use client";

import { Badge } from "@/components/ui/Badge";
import { matchSignal } from "@/lib/keywords";

export interface TickerItem {
  id: string;
  company: string;
  position: string;
  score: number | null;
}

/**
 * Recently scored roles as a static tonal chip row. Not a marquee.
 */
export function MarketTicker({ items }: { items: TickerItem[] }) {
  if (items.length === 0) return null;

  const visible = items.slice(0, 10);

  return (
    <div role="region" aria-label="Recently scored roles" className="mb-5">
      <p className="mb-2 text-[11px] font-medium tracking-wide text-ink-muted">
        Recently scored
      </p>
      <ul className="scrollbar-slim flex gap-2 overflow-x-auto pb-1">
        {visible.map((item) => (
          <li key={item.id} className="shrink-0">
            <TickerChip item={item} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function TickerChip({ item }: { item: TickerItem }) {
  const signal = item.score == null ? null : matchSignal(item.score);
  const tone =
    signal === "positive"
      ? "positive"
      : signal === "negative"
        ? "negative"
        : "accent";

  return (
    <Badge tone={tone} className="max-w-full gap-1.5 py-1.5">
      <span className="font-medium text-ink">{item.company}</span>
      <span aria-hidden="true">·</span>
      <span>{item.position}</span>
      {item.score != null ? (
        <>
          <span aria-hidden="true">·</span>
          <span className="font-numeral">{item.score}%</span>
        </>
      ) : null}
    </Badge>
  );
}
