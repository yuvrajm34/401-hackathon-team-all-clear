"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";

import { pickMemeForStage } from "@/lib/memes";
import { useIsMounted } from "@/lib/useIsMounted";
import type { Stage } from "@/lib/types";

export interface MemeEvent {
  stage: Stage;
  /** Unique per trigger so re-dropping into the same stage twice in a row
   * still remounts the card and replays the animation. */
  key: number;
}

// Total on-screen lifetime, pop-in through fade-out — kept to 2s end to end.
// Pop-in and fade-out share one duration so a single `transition` covers
// both the entry and exit animation.
const EDGE_MS = 300;
const VISIBLE_MS = 2000 - EDGE_MS * 2;

/**
 * Fixed-position overlay that celebrates (or commiserates) a pipeline stage
 * change with a meme. Good news gets a confetti burst; a rejection just
 * pops up and quietly fades — see `lib/memes.ts` for the stage -> image
 * mapping. Mounted once near the root of the Applications view and driven
 * by a single `event` prop so only one can ever be showing at a time.
 */
export function MemePopup({
  event,
  onDone,
}: {
  event: MemeEvent | null;
  onDone: () => void;
}) {
  const mounted = useIsMounted();
  if (!mounted) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center">
      <AnimatePresence>
        {event ? (
          <MemeCard key={event.key} stage={event.stage} onDone={onDone} />
        ) : null}
      </AnimatePresence>
    </div>,
    document.body,
  );
}

function MemeCard({ stage, onDone }: { stage: Stage; onDone: () => void }) {
  const reduceMotion = useReducedMotion();
  const meme = useMemo(() => pickMemeForStage(stage), [stage]);

  useEffect(() => {
    const timer = setTimeout(onDone, EDGE_MS + VISIBLE_MS);
    return () => clearTimeout(timer);
    // Only the initial mount should start the dismiss timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!meme?.sound) return;
    const audio = new Audio(meme.sound);
    audio.volume = 0.7;
    // Autoplay can still be blocked without a prior user gesture — the
    // drag itself counts as one in every browser tested, but fail silently
    // rather than throw if some environment disagrees.
    void audio.play().catch(() => {});
    return () => audio.pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!meme) return null;

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6, y: 12 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
      transition={{ duration: EDGE_MS / 1000, ease: [0.2, 0, 0, 1] }}
      className="relative"
    >
      {meme.confetti && !reduceMotion ? <Confetti /> : null}
      <img
        src={meme.src}
        alt=""
        className="max-h-[55vh] max-w-[min(85vw,26rem)] rounded-2xl object-contain shadow-2xl ring-1 ring-black/10"
      />
    </motion.div>
  );
}

const CONFETTI_COLORS = [
  "#f97316",
  "#22c55e",
  "#3b82f6",
  "#eab308",
  "#ec4899",
  "#8b5cf6",
];

/** A quick outward-then-falling burst of small rectangles, purely in
 * framer-motion — no charting/canvas library needed for something this
 * small and short-lived. */
function Confetti() {
  const particles = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const distance = 70 + Math.random() * 130;
        return {
          id: i,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          fall: 160 + Math.random() * 120,
          rotate: (Math.random() - 0.5) * 480,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          delay: Math.random() * 0.1,
          width: 5 + Math.random() * 5,
          height: 3 + Math.random() * 5,
        };
      }),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute left-1/2 top-1/2 rounded-[1px]"
          style={{
            width: p.width,
            height: p.height,
            backgroundColor: p.color,
          }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{
            x: p.x,
            y: p.y + p.fall,
            opacity: 0,
            rotate: p.rotate,
          }}
          transition={{
            duration: (EDGE_MS + VISIBLE_MS) / 1000,
            delay: p.delay,
            ease: [0.15, 0.7, 0.3, 1],
          }}
        />
      ))}
    </div>
  );
}
