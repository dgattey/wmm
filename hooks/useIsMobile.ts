"use client";

import { useSyncExternalStore } from "react";
import { MOBILE_BREAKPOINT_QUERY } from "@/lib/portfolioLayout";

function getSnapshot(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches;
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") {
        return () => {};
      }

      const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT_QUERY);
      const handleChange = () => {
        onStoreChange();
      };

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    },
    getSnapshot,
    () => false
  );
}
