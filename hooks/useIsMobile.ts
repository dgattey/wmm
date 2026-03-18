"use client";

import { useEffect, useState } from "react";
import { MOBILE_BREAKPOINT_QUERY } from "@/lib/portfolioLayout";

function getInitialIsMobile(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches;
}

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(getInitialIsMobile);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return isMobile;
}
