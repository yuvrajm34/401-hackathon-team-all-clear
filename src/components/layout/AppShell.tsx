"use client";

import {
  CalendarDays,
  Compass,
  FileText,
  LayoutDashboard,
  Settings,
  SquareKanban,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ComponentType, ReactNode, TouchEvent, UIEvent } from "react";

import { Toaster } from "@/components/ui/Toaster";
import { cn } from "@/lib/cn";

import { AtmosphereWell } from "./AtmosphereWell";
import { ThemeToggle } from "./ThemeToggle";

/** Same shape for the on-load entrance and the scroll-triggered exit, so
 * scrolling away just plays the mount animation in reverse. Modeled after
 * Google's logo: a quick, slightly springy settle rather than a linear fade. */
const LOGO_VARIANTS = {
  shown: { opacity: 1, scale: 1, y: 0 },
  hidden: { opacity: 0, scale: 0.7, y: -10 },
};

/** Opacity only, for reduced-motion — same shown/hidden states, no scale
 * or position movement. */
const LOGO_VARIANTS_REDUCED = {
  shown: { opacity: 1 },
  hidden: { opacity: 0 },
};

/** How far past the top (px) the scroll container has to move before the
 * logo hides — small enough to react quickly, large enough to ignore
 * incidental scroll jitter right at the top. */
const HIDE_SCROLL_THRESHOLD = 24;

/** Minimum horizontal travel (px) for a touch gesture to count as a
 * side-to-side swipe rather than an incidental drift. */
const SWIPE_MIN_DISTANCE = 70;
/** Vertical travel can't exceed this fraction of horizontal travel — keeps
 * an ordinary vertical scroll (which always has *some* horizontal jitter)
 * from being misread as a swipe. */
const SWIPE_MAX_VERTICAL_RATIO = 0.5;
/** A slow drag that happens to cover the distance isn't a "swipe" gesture;
 * capping the duration keeps this feeling like a flick, not a scroll. */
const SWIPE_MAX_DURATION_MS = 600;

/** How far (px) a page slides in/out during a tab change — small and quick
 * rather than a full-screen slide, so it reads as "smoother" without
 * feeling like a slow, heavy page transition. */
const PAGE_SLIDE_DISTANCE = 28;

/** `custom` here is the direction: `1` moving right through the tab order
 * (content slides in from the right, the way swiping left to reveal the
 * next page should feel), `-1` moving left, `0` for a same-tab navigation
 * (a drill-down into a detail page) where a left/right slide wouldn't mean
 * anything — that case just crossfades. */
const PAGE_VARIANTS = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction * PAGE_SLIDE_DISTANCE,
  }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({
    opacity: 0,
    x: -direction * PAGE_SLIDE_DISTANCE,
  }),
};

const PAGE_VARIANTS_REDUCED = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
};

const WORDMARK = "ApplyPath";

/** Reuses the same multi-color set as the meme-popup confetti, so the two
 * "celebration" moments in the app feel like one visual language instead of
 * two unrelated palettes. */
const ACCENT_COLORS = [
  "#f97316",
  "#22c55e",
  "#3b82f6",
  "#eab308",
  "#ec4899",
  "#8b5cf6",
];

const LETTER_STAGGER_S = 0.05;
/** How long a letter takes to pop into place (position/scale/opacity). */
const LETTER_POP_S = 0.32;
/** How long, after landing, its accent color takes to drain to the normal
 * text color. */
const LETTER_DRAIN_S = 0.42;

/**
 * "ApplyPath", drawn in letter by letter — each one pops into place already
 * carrying its own bright accent color (the actual signature move of
 * Google's own wordmark: every letter its own color), which then drains
 * away to the normal ink color once it's landed. Remounted via `resetKey`
 * whenever the logo scrolls back into view, so the reveal replays instead
 * of only ever happening once on first load.
 *
 * The color fade works as a crossfade rather than an animated `color`
 * property: each letter cell stacks a normal, always-ink-colored base
 * letter under an absolutely-positioned accent-colored copy that fades out
 * on top of it. That sidesteps needing to know the theme's actual ink color
 * value (which differs between light/dark and isn't something framer-motion
 * can interpolate *to* without it) — light/dark just falls out of the base
 * letter's ordinary `text-ink` inheritance.
 */
function AnimatedWordmark({
  reduceMotion,
  resetKey,
}: {
  reduceMotion: boolean;
  resetKey: number;
}) {
  return (
    <span key={resetKey} aria-label={WORDMARK} className="inline-flex">
      {WORDMARK.split("").map((letter, index) => {
        const delay = index * LETTER_STAGGER_S;
        return (
          <motion.span
            key={index}
            className="relative inline-block"
            initial={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 14, scale: 0.4 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: reduceMotion ? 0.25 : LETTER_POP_S,
              delay,
              ease: [0.2, 0, 0, 1],
            }}
          >
            <span aria-hidden="true">{letter}</span>
            {reduceMotion ? null : (
              <motion.span
                aria-hidden="true"
                className="absolute inset-0"
                style={{ color: ACCENT_COLORS[index % ACCENT_COLORS.length] }}
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{
                  duration: LETTER_DRAIN_S,
                  delay: delay + LETTER_POP_S,
                  ease: "easeInOut",
                }}
              >
                {letter}
              </motion.span>
            )}
          </motion.span>
        );
      })}
    </span>
  );
}

interface NavItem {
  href: string;
  label: string;
  shortLabel: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}

const NAV: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    shortLabel: "Home",
    icon: LayoutDashboard,
  },
  {
    href: "/applications",
    label: "Applications",
    shortLabel: "Track",
    icon: SquareKanban,
  },
  {
    href: "/calendar",
    label: "Calendar",
    shortLabel: "Cal",
    icon: CalendarDays,
  },
  {
    href: "/discover",
    label: "Discover Jobs",
    shortLabel: "Find",
    icon: Compass,
  },
  { href: "/resumes", label: "Resumes", shortLabel: "Resumes", icon: FileText },
  { href: "/settings", label: "Settings", shortLabel: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [logoVisible, setLogoVisible] = useState(true);
  // Bumped every time the logo transitions from hidden back to visible, and
  // used as the wordmark's React `key` so it fully remounts and replays the
  // letter-by-letter reveal each time you scroll back to the top — not just
  // once on the very first load.
  const [wordmarkResetKey, setWordmarkResetKey] = useState(0);
  const wasVisibleRef = useRef(true);
  const scrollTicking = useRef(false);

  // Which way the page transition slides: whichever direction the active
  // tab actually moved, so tapping the bottom nav gets the same "carousel"
  // feel as swiping, not just the swipe gesture itself.
  const [pageDirection, setPageDirection] = useState(0);
  const prevNavIndexRef = useRef<number | null>(null);
  const currentNavIndex = NAV.findIndex((item) => isActive(pathname, item.href));

  useEffect(() => {
    const prevIndex = prevNavIndexRef.current;
    if (prevIndex !== null && currentNavIndex !== -1 && prevIndex !== currentNavIndex) {
      setPageDirection(currentNavIndex > prevIndex ? 1 : -1);
    } else if (currentNavIndex === -1 || prevIndex === currentNavIndex) {
      setPageDirection(0);
    }
    if (currentNavIndex !== -1) prevNavIndexRef.current = currentNavIndex;
  }, [currentNavIndex]);

  const handleScroll = (event: UIEvent<HTMLElement>) => {
    if (scrollTicking.current) return;
    scrollTicking.current = true;
    const target = event.currentTarget;
    requestAnimationFrame(() => {
      const nextVisible = target.scrollTop <= HIDE_SCROLL_THRESHOLD;
      if (nextVisible && !wasVisibleRef.current) {
        setWordmarkResetKey((key) => key + 1);
      }
      wasVisibleRef.current = nextVisible;
      setLogoVisible(nextVisible);
      scrollTicking.current = false;
    });
  };

  // Swipe left/right between the primary nav tabs on touch devices. Purely
  // passive — no preventDefault, no touch-action changes — so it never
  // fights native scrolling. A gesture starting inside a horizontally
  // scrollable area (the Kanban board, a wide table, the dashboard ticker —
  // anything marked `data-swipe-ignore`) is ignored entirely, since that
  // touch is meant to scroll that element, not switch pages.
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(
    null,
  );
  const touchIgnored = useRef(false);

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    touchIgnored.current = Boolean(
      (event.target as HTMLElement).closest("[data-swipe-ignore]"),
    );
    if (touchIgnored.current) return;
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  };

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (touchIgnored.current || !start) return;

    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const dt = Date.now() - start.time;

    if (dt > SWIPE_MAX_DURATION_MS) return;
    if (Math.abs(dx) < SWIPE_MIN_DISTANCE) return;
    if (Math.abs(dy) > Math.abs(dx) * SWIPE_MAX_VERTICAL_RATIO) return;

    const currentIndex = NAV.findIndex((item) => isActive(pathname, item.href));
    if (currentIndex === -1) return;

    if (dx < 0 && currentIndex < NAV.length - 1) {
      router.push(NAV[currentIndex + 1].href);
    } else if (dx > 0 && currentIndex > 0) {
      router.push(NAV[currentIndex - 1].href);
    }
  };

  return (
    <div className="relative z-10 flex h-dvh flex-col overflow-hidden">
      <AtmosphereWell />

      <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-center px-3 pt-3 print:hidden">
        <motion.div
          initial="hidden"
          animate={logoVisible ? "shown" : "hidden"}
          variants={reduceMotion ? LOGO_VARIANTS_REDUCED : LOGO_VARIANTS}
          transition={
            reduceMotion
              ? { duration: 0.2 }
              : { type: "spring", stiffness: 320, damping: 22 }
          }
          className={cn(
            "pointer-events-auto",
            !logoVisible && "pointer-events-none",
          )}
        >
          <Link
            href="/"
            className="block rounded-full bg-surface/90 px-5 py-2 shadow-raised backdrop-blur-xl"
          >
            <span className="font-display text-[20px] font-semibold tracking-tight text-ink sm:text-[22px]">
              <AnimatedWordmark
                reduceMotion={Boolean(reduceMotion)}
                resetKey={wordmarkResetKey}
              />
            </span>
          </Link>
        </motion.div>
        <div className="pointer-events-auto absolute right-3 top-3 sm:right-6">
          <ThemeToggle />
        </div>
      </header>

      <main
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="print-root relative isolate min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-28 pt-16 sm:px-6"
      >
        <AnimatePresence mode="popLayout" initial={false} custom={pageDirection}>
          <motion.div
            key={pathname}
            custom={pageDirection}
            variants={reduceMotion ? PAGE_VARIANTS_REDUCED : PAGE_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
            className="relative z-10"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav
        aria-label="Main"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] print:hidden"
      >
        <ul className="pointer-events-auto flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full bg-surface/90 p-1.5 shadow-raised backdrop-blur-xl">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  aria-label={item.label}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-2 py-2 text-[11px] font-medium transition-colors duration-200 ease-[var(--ease-emphasized)] sm:px-3 sm:text-sm",
                    active
                      ? "bg-brand-soft text-brand-on-soft"
                      : "text-ink-muted hover:bg-surface-muted hover:text-ink",
                  )}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span className="hidden min-[400px]:inline">
                    {item.shortLabel}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Toaster />
    </div>
  );
}
