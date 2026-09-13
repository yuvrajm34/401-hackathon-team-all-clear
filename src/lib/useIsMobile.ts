"use client";

import { useEffect, useState } from "react";

/** Tailwind's default `sm` breakpoint (640px) is the mobile/desktop split
 * already used throughout this app's own responsive classes — matching it
 * here keeps this hook's notion of "mobile" consistent with the CSS. */
const MOBILE_QUERY = "(max-width: 639px)";

/** `false` on the server and until the first client effect runs, then
 * tracks the media query live. */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return isMobile;
}
