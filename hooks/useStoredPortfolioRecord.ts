"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { POLL_INTERVAL_MS } from "@/lib/portfolioLayout";
import { fetchPortfolioData } from "@/lib/portfolioDataClient";
import {
  loadStoredPortfolio,
  saveStoredPortfolioData,
  touchStoredPortfolio,
} from "@/lib/storage";
import type {
  FidelityPosition,
  PortfolioData,
  StoredPortfolioSummary,
} from "@/lib/types";

interface UseStoredPortfolioRecordInput {
  portfolioId: string;
  width: number;
  height: number;
  layoutMode: "mobile" | "desktop";
}

export interface StoredPortfolioRecordState {
  summary: StoredPortfolioSummary | null;
  positions: FidelityPosition[] | null;
  portfolioData: PortfolioData | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  restoredFromStorage: boolean;
  isMissing: boolean;
  refreshData: () => Promise<void>;
  refreshFromStorage: () => void;
}

export function useStoredPortfolioRecord({
  portfolioId,
  width,
  height,
  layoutMode,
}: UseStoredPortfolioRecordInput): StoredPortfolioRecordState {
  const [summary, setSummary] = useState<StoredPortfolioSummary | null>(null);
  const [positions, setPositions] = useState<FidelityPosition[] | null>(null);
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoredFromStorage, setRestoredFromStorage] = useState(false);
  const [isMissing, setIsMissing] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const positionsRef = useRef<FidelityPosition[] | null>(null);
  const requestTokenRef = useRef(0);
  const lastLayoutModeRef = useRef<"mobile" | "desktop">(layoutMode);
  const portfolioIdRef = useRef(portfolioId);
  const widthRef = useRef(width);
  const heightRef = useRef(height);

  positionsRef.current = positions;
  portfolioIdRef.current = portfolioId;
  widthRef.current = width;
  heightRef.current = height;

  const refreshPortfolioData = useCallback(
    async (
      nextPositions: FidelityPosition[],
      endpoint: string,
      showLoading: boolean
    ) => {
      const requestToken = ++requestTokenRef.current;

      if (showLoading) {
        setIsLoading(true);
      }

      try {
        const nextPortfolioData = await fetchPortfolioData({
          positions: nextPositions,
          endpoint,
          width: widthRef.current,
          height: heightRef.current,
        });

        if (requestTokenRef.current !== requestToken) {
          return;
        }

        setPortfolioData(nextPortfolioData);
        saveStoredPortfolioData(portfolioIdRef.current, nextPortfolioData);
        const now = new Date().toISOString();
        setSummary((currentSummary) =>
          currentSummary
            ? {
                ...currentSummary,
                totalValue: nextPortfolioData.summary.totalValue,
                lastViewedAt: now,
              }
            : currentSummary
        );
        setError(null);
      } catch (nextError) {
        if (requestTokenRef.current !== requestToken) {
          return;
        }

        console.error("Failed to fetch portfolio data:", nextError);
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Failed to load portfolio data"
        );
      } finally {
        if (showLoading && requestTokenRef.current === requestToken) {
          setIsLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (!portfolioId) {
      requestTokenRef.current += 1;
      setIsLoading(true);
      setError(null);
      setIsMissing(false);
      setRestoredFromStorage(false);
      setSummary(null);
      setPositions(null);
      setPortfolioData(null);
      return;
    }

    requestTokenRef.current += 1;
    setIsLoading(true);
    setError(null);
    setIsMissing(false);
    setRestoredFromStorage(false);
    setSummary(null);
    setPositions(null);
    setPortfolioData(null);

    const storedPortfolio = loadStoredPortfolio(portfolioId);
    if (!storedPortfolio) {
      setSummary(null);
      setPositions(null);
      setPortfolioData(null);
      setIsMissing(true);
      setIsLoading(false);
      return;
    }

    resetInitialScrollPosition();
    touchStoredPortfolio(portfolioId);
    setSummary(storedPortfolio.summary);
    setPositions(storedPortfolio.positions);
    setPortfolioData(storedPortfolio.portfolioData);
    setRestoredFromStorage(storedPortfolio.portfolioData !== null);

    if (storedPortfolio.portfolioData !== null) {
      setIsLoading(false);
      void refreshPortfolioData(storedPortfolio.positions, "/api/portfolio", false);
      return;
    }

    void refreshPortfolioData(storedPortfolio.positions, "/api/portfolio", true);
  }, [portfolioId, refreshPortfolioData]);

  useEffect(() => {
    if (lastLayoutModeRef.current === layoutMode) {
      return;
    }

    lastLayoutModeRef.current = layoutMode;

    if (!positionsRef.current) {
      return;
    }

    void refreshPortfolioData(positionsRef.current, "/api/portfolio/refresh", false);
  }, [layoutMode, refreshPortfolioData]);

  useEffect(() => {
    if (!positions) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    function refreshVisiblePortfolio() {
      if (document.visibilityState === "visible" && positionsRef.current) {
        void refreshPortfolioData(
          positionsRef.current,
          "/api/portfolio/refresh",
          false
        );
      }
    }

    pollRef.current = setInterval(refreshVisiblePortfolio, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", refreshVisiblePortfolio);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }

      document.removeEventListener("visibilitychange", refreshVisiblePortfolio);
    };
  }, [positions, refreshPortfolioData]);

  const refreshData = useCallback(async () => {
    if (!positionsRef.current) {
      return;
    }

    setIsRefreshing(true);
    await refreshPortfolioData(positionsRef.current, "/api/portfolio/refresh", false);
    setIsRefreshing(false);
  }, [refreshPortfolioData]);

  const refreshFromStorage = useCallback(() => {
    const stored = loadStoredPortfolio(portfolioId);
    if (stored) {
      setSummary(stored.summary);
    }
  }, [portfolioId]);

  return {
    summary,
    positions,
    portfolioData,
    isLoading,
    isRefreshing,
    error,
    restoredFromStorage,
    isMissing,
    refreshData,
    refreshFromStorage,
  };
}

function resetInitialScrollPosition() {
  if (typeof window === "undefined") {
    return;
  }

  const previousScrollRestoration = window.history.scrollRestoration;
  window.history.scrollRestoration = "manual";
  window.scrollTo(0, 0);

  window.setTimeout(() => {
    window.history.scrollRestoration = previousScrollRestoration;
  }, 0);
}
