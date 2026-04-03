"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Detects when a sticky element is in its "docked" (stuck) state using
 * IntersectionObserver. Fires only when intersection state changes—no scroll
 * or resize listeners. Caller must render a sentinel element at the dock point
 * and pass a ref to the header (element above the search bar) so we measure
 * its height—no magic numbers.
 */
export function useIsStickyDocked(headerRef: React.RefObject<HTMLElement | null>): [
  React.RefObject<HTMLDivElement | null>,
  boolean,
  number
] {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [stickyTopPx, setStickyTopPx] = useState(0);
  const [isDocked, setIsDocked] = useState(false);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const updateHeight = () => {
      // Round up to avoid fractional-pixel rootMargin parsing edge cases (common on mobile).
      setStickyTopPx(Math.ceil(header.getBoundingClientRect().height));
    };
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(header);
    return () => observer.disconnect();
  }, [headerRef]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || stickyTopPx <= 0) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const { bottom } = entry.boundingClientRect;
        // Use <= to avoid pixel-rounding edge cases (common on mobile) where the
        // sentinel "bottom" lands exactly on the sticky header boundary.
        setIsDocked(bottom <= stickyTopPx);
      },
      {
        root: null,
        rootMargin: `-${stickyTopPx}px 0px 0px 0px`,
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [stickyTopPx]);

  return [sentinelRef, isDocked, stickyTopPx];
}
