"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { AuthGate } from "@/components/auth/AuthGate";

import { AppShell } from "./AppShell";

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <AuthGate>
      <AppShell>{children}</AppShell>
    </AuthGate>
  );
}
