"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Detects when a sticky element is in its "docked" (stuck) state using
 * IntersectionObserver. Fires only when intersection state changes—no scroll
 * or resize listeners. Caller must render a sentinel element at the dock point.
 */
export function useIsStickyDocked(stickyTopPx: number): [
  React.RefObject<HTMLDivElement | null>,
  boolean
] {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [isDocked, setIsDocked] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Sentinel above the dock line = search bar is docked
        setIsDocked(!entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: `-${stickyTopPx}px 0 0 0`,
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [stickyTopPx]);

  return [sentinelRef, isDocked];
}
