"use client";

import {
  Compass,
  FileText,
  LayoutDashboard,
  Settings,
  SquareKanban,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, ReactNode } from "react";

import { QuickAddButton } from "@/components/applications/QuickAddButton";
import { Toaster } from "@/components/ui/Toaster";
import { cn } from "@/lib/cn";

import { AtmosphereWell } from "./AtmosphereWell";
import { ThemeToggle } from "./ThemeToggle";

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
  { href: "/discover", label: "Discover", shortLabel: "Find", icon: Compass },
  { href: "/resumes", label: "Resumes", shortLabel: "Resumes", icon: FileText },
  { href: "/settings", label: "Settings", shortLabel: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="relative z-10 flex h-dvh overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="app-chrome sticky top-0 hidden h-dvh w-60 shrink-0 flex-col bg-surface shadow-card md:flex print:hidden">
        <div className="px-5 py-5">
          <Wordmark />
        </div>

        <nav aria-label="Main" className="flex-1 px-3">
          <ul className="space-y-1">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors duration-200 ease-[var(--ease-emphasized)]",
                      active
                        ? "bg-brand-soft text-brand-on-soft"
                        : "text-ink-muted hover:bg-surface-muted hover:text-ink",
                    )}
                  >
                    <Icon size={18} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="space-y-3 px-5 py-5">
          <p className="text-[11px] leading-relaxed text-ink-subtle">
            Everything you enter stays in this browser. Export a backup from
            Settings before clearing site data.
          </p>
          <ThemeToggle />
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Header: brand on mobile, actions on every size. On desktop the
            sidebar already covers brand and theme, so the bar itself is
            only needed where it has something to show (Discover's add
            button) — otherwise it would just be an empty strip. */}
        <header
          className={cn(
            "app-chrome sticky top-0 z-30 flex h-14 items-center justify-between gap-3 bg-surface px-4 shadow-card sm:px-6 print:hidden",
            !isActive(pathname, "/discover") && "md:hidden",
          )}
        >
          <div className="md:hidden">
            <Wordmark compact />
          </div>
          <div className="hidden md:block" />

          <div className="flex items-center gap-2">
            <span className="md:hidden">
              <ThemeToggle compact />
            </span>
            {isActive(pathname, "/discover") ? (
              <>
                <span className="hidden sm:block">
                  <QuickAddButton size="sm" />
                </span>
                <span className="sm:hidden">
                  <QuickAddButton iconOnly variant="primary" />
                </span>
              </>
            ) : null}
          </div>
        </header>

        <main className="print-root relative isolate min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-24 pt-5 sm:px-6 sm:pb-10">
          <AtmosphereWell />
          <div className="relative z-10">{children}</div>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="Main"
        className="app-chrome fixed inset-x-0 bottom-0 z-40 [transform:translateZ(0)] bg-surface shadow-raised will-change-transform md:hidden print:hidden"
      >
        <ul className="mx-auto flex max-w-md items-stretch justify-between px-2 pb-[env(safe-area-inset-bottom)]">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors duration-200",
                    active ? "text-brand" : "text-ink-subtle",
                  )}
                >
                  <Icon size={20} aria-hidden="true" />
                  <span>{item.shortLabel}</span>
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

function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2">
      <span className="flex flex-col leading-none">
        <span className="font-display text-[22px] font-semibold leading-7 text-ink">
          ApplyPath
        </span>
        {compact ? null : (
          <span className="mt-1 text-[11px] text-ink-muted">
            Job application organizer
          </span>
        )}
      </span>
    </Link>
  );
}
