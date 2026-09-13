"use client";

import {
  CalendarDays,
  Compass,
  FileText,
  LayoutDashboard,
  Settings,
  SquareKanban,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, ReactNode } from "react";

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
  {
    href: "/calendar",
    label: "Calendar",
    shortLabel: "Cal",
    icon: CalendarDays,
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
    <div className="relative z-10 flex h-dvh flex-col overflow-hidden">
      <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-center px-3 pt-3 print:hidden">
        <Link
          href="/"
          className="pointer-events-auto rounded-full bg-surface/90 px-5 py-2 shadow-raised backdrop-blur-xl"
        >
          <span className="font-display text-[20px] font-semibold tracking-tight text-ink sm:text-[22px]">
            ApplyPath
          </span>
        </Link>
        <div className="pointer-events-auto absolute right-3 top-3 sm:right-6">
          <ThemeToggle />
        </div>
      </header>

      <main className="print-root relative isolate min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-28 pt-16 sm:px-6">
        <AtmosphereWell />
        <div className="relative z-10">{children}</div>
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
