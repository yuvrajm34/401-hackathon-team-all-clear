"use client";

import { useSyncExternalStore } from "react";

import { useAppStore } from "./useAppStore";

const subscribe = (onStoreChange: () => void) =>
  useAppStore.persist.onFinishHydration(onStoreChange);

const getSnapshot = () => useAppStore.persist.hasHydrated();
const getServerSnapshot = () => false;

/**
 * `false` until the persisted store has been read from localStorage.
 *
 * The server has no access to localStorage, so the server snapshot is always
 * `false`; React swaps in the real value after hydration. Pages render a
 * skeleton for that one pass instead of risking a hydration mismatch.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
