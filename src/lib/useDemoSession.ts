"use client";

import { useEffect, useState } from "react";

import {
  readSession,
  subscribeSession,
  type DemoSession,
} from "@/lib/demo-session";

/** `undefined` until localStorage has been read on the client. */
export function useDemoSession(): DemoSession | null | undefined {
  const [session, setSession] = useState<DemoSession | null | undefined>(
    undefined,
  );

  useEffect(() => {
    const sync = () => setSession(readSession());
    sync();
    return subscribeSession(sync);
  }, []);

  return session;
}
