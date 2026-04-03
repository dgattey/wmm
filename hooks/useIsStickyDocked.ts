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

    const computeDocked = () => {
      const { bottom } = sentinel.getBoundingClientRect();
      setIsDocked(bottom <= stickyTopPx);
    };

    let rafId = 0;
    const scheduleCompute = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        computeDocked();
      });
    };

    // Initial compute so we have a correct state even if IntersectionObserver
    // is delayed or doesn't fire (seen in some mobile/headless environments).
    computeDocked();

    const observer = new IntersectionObserver(
      ([entry]) => {
        const { bottom } = entry.boundingClientRect;
        setIsDocked(bottom <= stickyTopPx);
      },
      {
        root: null,
        rootMargin: `-${stickyTopPx}px 0px 0px 0px`,
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    window.addEventListener("scroll", scheduleCompute, { passive: true });
    window.addEventListener("resize", scheduleCompute);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", scheduleCompute);
      window.removeEventListener("resize", scheduleCompute);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [stickyTopPx]);

  return [sentinelRef, isDocked, stickyTopPx];
}
