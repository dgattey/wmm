"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type {
  FilterState,
  SortConfig,
  TreeMapGrouping,
  ViewMode,
} from "@/lib/types";
import {
  arePortfolioUrlStatesEqual,
  buildPortfolioSearchParams,
  normalizePortfolioUrlState,
  parsePortfolioUrlState,
  type PortfolioUrlState,
} from "@/lib/urlFilters";

/** Filters / table / treemap controls that are mirrored in the query string. */
export interface PortfolioUrlSlice {
  filters: FilterState;
  selectedFunds: string[];
  sortConfig: SortConfig;
  viewMode: ViewMode;
  treeMapGrouping: TreeMapGrouping;
}

interface UsePortfolioUrlSyncParams {
  searchParamsString: string;
  pathname: string;
  router: { replace: (href: string, options?: { scroll?: boolean }) => void };
  portfolioSlice: PortfolioUrlSlice;
  syncWithUrlState: (state: PortfolioUrlState) => void;
  /** Trailing debounce for state → URL (search typing, rapid toggles). */
  urlWriteDebounceMs?: number;
}

/**
 * Keeps portfolio UI state and the URL query string in sync with two explicit
 * channels (no skip-next-effect coordination):
 *
 * 1. **URL → state** — runs when `searchParamsString` changes (back/forward,
 *    shared links, or `router.replace` completing). If the new URL matches the
 *    slice we just pushed (`pendingDesiredUrlStateRef`), we treat it as our own
 *    navigation and do not call `syncWithUrlState`. Otherwise we apply the URL
 *    into React state.
 * 2. **State → URL** — debounced; calls `router.replace` only when the parsed
 *    URL slice differs from the current portfolio slice.
 */
export function usePortfolioUrlSync({
  searchParamsString,
  pathname,
  router,
  portfolioSlice,
  syncWithUrlState,
  urlWriteDebounceMs = 350,
}: UsePortfolioUrlSyncParams): void {
  const syncWithUrlStateRef = useRef(syncWithUrlState);
  const portfolioSliceRef = useRef(portfolioSlice);
  const searchParamsRef = useRef(searchParamsString);
  const pathnameRef = useRef(pathname);
  const routerRef = useRef(router);

  const lastAcknowledgedUrlStateRef = useRef<PortfolioUrlState | null>(null);
  const pendingDesiredUrlStateRef = useRef<PortfolioUrlState | null>(null);
  const urlWriteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    syncWithUrlStateRef.current = syncWithUrlState;
    portfolioSliceRef.current = portfolioSlice;
    searchParamsRef.current = searchParamsString;
    pathnameRef.current = pathname;
    routerRef.current = router;
  });

  useEffect(() => {
    const fromUrl = parsePortfolioUrlState(new URLSearchParams(searchParamsString));

    if (
      pendingDesiredUrlStateRef.current !== null &&
      arePortfolioUrlStatesEqual(fromUrl, pendingDesiredUrlStateRef.current)
    ) {
      lastAcknowledgedUrlStateRef.current = fromUrl;
      pendingDesiredUrlStateRef.current = null;
      return;
    }

    pendingDesiredUrlStateRef.current = null;

    if (
      lastAcknowledgedUrlStateRef.current !== null &&
      arePortfolioUrlStatesEqual(fromUrl, lastAcknowledgedUrlStateRef.current)
    ) {
      return;
    }

    lastAcknowledgedUrlStateRef.current = fromUrl;
    syncWithUrlStateRef.current(fromUrl);
  }, [searchParamsString]);

  useEffect(() => {
    const slice = portfolioSliceRef.current;
    const desired = normalizePortfolioUrlState({
      filters: slice.filters,
      selectedFunds: slice.selectedFunds,
      sortConfig: slice.sortConfig,
      viewMode: slice.viewMode,
      treeMapGrouping: slice.treeMapGrouping,
    });
    const fromUrl = parsePortfolioUrlState(new URLSearchParams(searchParamsRef.current));
    if (arePortfolioUrlStatesEqual(fromUrl, desired)) {
      if (urlWriteTimerRef.current) {
        clearTimeout(urlWriteTimerRef.current);
        urlWriteTimerRef.current = null;
      }
      return;
    }

    if (urlWriteTimerRef.current) {
      clearTimeout(urlWriteTimerRef.current);
    }

    urlWriteTimerRef.current = setTimeout(() => {
      urlWriteTimerRef.current = null;
      const latest = portfolioSliceRef.current;
      const latestDesired = normalizePortfolioUrlState({
        filters: latest.filters,
        selectedFunds: latest.selectedFunds,
        sortConfig: latest.sortConfig,
        viewMode: latest.viewMode,
        treeMapGrouping: latest.treeMapGrouping,
      });
      const latestFromUrl = parsePortfolioUrlState(
        new URLSearchParams(searchParamsRef.current)
      );
      if (arePortfolioUrlStatesEqual(latestFromUrl, latestDesired)) {
        return;
      }

      pendingDesiredUrlStateRef.current = latestDesired;
      const nextSearchParams = buildPortfolioSearchParams(
        latestDesired,
        new URLSearchParams(searchParamsRef.current)
      );

      routerRef.current.replace(
        nextSearchParams ? `${pathnameRef.current}?${nextSearchParams}` : pathnameRef.current,
        { scroll: false }
      );
    }, urlWriteDebounceMs);

    return () => {
      if (urlWriteTimerRef.current) {
        clearTimeout(urlWriteTimerRef.current);
        urlWriteTimerRef.current = null;
      }
    };
  }, [
    searchParamsString,
    pathname,
    portfolioSlice.filters,
    portfolioSlice.selectedFunds,
    portfolioSlice.sortConfig,
    portfolioSlice.treeMapGrouping,
    portfolioSlice.viewMode,
    urlWriteDebounceMs,
  ]);
}
