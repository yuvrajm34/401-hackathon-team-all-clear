"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * `false` on the server and during hydration, `true` afterwards.
 *
 * Used to delay portal rendering until `document.body` exists. Implemented with
 * `useSyncExternalStore` rather than a mount effect so there is no extra render
 * pass and no setState inside an effect.
 */
export function useIsMounted(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
