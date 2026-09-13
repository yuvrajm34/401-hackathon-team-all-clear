"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { AtmosphereWell } from "@/components/layout/AtmosphereWell";
import { useDemoSession } from "@/lib/useDemoSession";

export function AuthGate({ children }: { children: ReactNode }) {
  const session = useDemoSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (session === undefined) return;
    if (!session) router.replace("/login");
  }, [session, router, pathname]);

  if (session === undefined || !session) {
    return (
      <div className="relative h-dvh overflow-hidden">
        <AtmosphereWell />
      </div>
    );
  }

  return <>{children}</>;
}
