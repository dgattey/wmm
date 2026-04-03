"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface StickyDockedOptions {
  expandedHeightPx?: number;
  collapsedHeightPx?: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Tracks when the search row reaches the sticky header and exposes a
 * scroll-progress value for smoothly collapsing the header between expanded and
 * collapsed heights.
 */
export function useIsStickyDocked(
  headerRef: React.RefObject<HTMLElement | null>,
  options?: StickyDockedOptions
): [React.RefObject<HTMLDivElement | null>, boolean, number, number] {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [fallbackHeaderHeightPx, setFallbackHeaderHeightPx] = useState(0);
  const [isDocked, setIsDocked] = useState(false);
  const [collapseProgress, setCollapseProgress] = useState(0);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const updateHeight = () => {
      // Round up to avoid fractional-pixel measurement churn near the dock point.
      setFallbackHeaderHeightPx(Math.ceil(header.getBoundingClientRect().height));
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(header);
    return () => observer.disconnect();
  }, [headerRef]);

  const stickyTopPx = useMemo(() => {
    const measuredExpandedHeightPx = options?.expandedHeightPx ?? fallbackHeaderHeightPx;
    return Math.max(Math.ceil(measuredExpandedHeightPx), 0);
  }, [fallbackHeaderHeightPx, options?.expandedHeightPx]);

  const collapsedTopPx = useMemo(() => {
    const rawCollapsedHeightPx = options?.collapsedHeightPx ?? stickyTopPx;
    return clamp(Math.ceil(rawCollapsedHeightPx), 0, stickyTopPx);
  }, [options?.collapsedHeightPx, stickyTopPx]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || stickyTopPx <= 0) return;

    let frame = 0;

    const update = () => {
      frame = 0;

      const bottom = sentinel.getBoundingClientRect().bottom;
      const nextIsDocked = bottom <= stickyTopPx;
      const collapseRangePx = stickyTopPx - collapsedTopPx;
      const nextCollapseProgress =
        collapseRangePx > 0
          ? clamp((stickyTopPx - bottom) / collapseRangePx, 0, 1)
          : nextIsDocked
            ? 1
            : 0;

      setIsDocked((prev) => (prev === nextIsDocked ? prev : nextIsDocked));
      setCollapseProgress((prev) =>
        Math.abs(prev - nextCollapseProgress) < 0.001 ? prev : nextCollapseProgress
      );
    };

    const scheduleUpdate = () => {
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(update);
    };

    update();

    window.addEventListener("scroll", scheduleUpdate, { capture: true, passive: true });
    window.addEventListener("resize", scheduleUpdate);

    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(sentinel);

    return () => {
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener("scroll", scheduleUpdate, true);
      window.removeEventListener("resize", scheduleUpdate);
      observer.disconnect();
    };
  }, [collapsedTopPx, stickyTopPx]);

  return [sentinelRef, isDocked, stickyTopPx, collapseProgress];
}
