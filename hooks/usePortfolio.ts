"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type {
  FidelityPosition,
  PortfolioData,
  FilterState,
  SortConfig,
  TableRow,
  TreeMapNode,
  ViewMode,
} from "@/lib/types";
import { parseCSV } from "@/lib/parseCSV";
import { sortTableRows } from "@/lib/tableSort";
import { savePortfolio, loadPortfolio, clearPortfolio } from "@/lib/storage";

const POLL_INTERVAL = 5000;

export function usePortfolio() {
  const [positions, setPositions] = useState<FidelityPosition[] | null>(null);
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [filters, setFilters] = useState<FilterState>({
    investmentTypes: [],
    accounts: [],
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "totalValue",
    direction: "desc",
  });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("holdings");
  const [focusedFund, setFocusedFund] = useState<string | null>(null);

  const mountedRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const positionsRef = useRef<FidelityPosition[] | null>(null);

  positionsRef.current = positions;

  const fetchData = useCallback(
    async (pos: FidelityPosition[], endpoint: string) => {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ positions: pos, width: 1200, height: 400 }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server error: ${res.status}`);
        }
        const data: PortfolioData = await res.json();
        setPortfolioData(data);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch portfolio data:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load portfolio data"
        );
      }
    },
    []
  );

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const saved = loadPortfolio();
    if (saved) {
      setPositions(saved);
      fetchData(saved, "/api/portfolio").finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [fetchData]);

  useEffect(() => {
    if (!positions) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    function poll() {
      if (document.visibilityState === "visible" && positionsRef.current) {
        fetchData(positionsRef.current, "/api/portfolio/refresh");
      }
    }

    pollRef.current = setInterval(poll, POLL_INTERVAL);

    function handleVisibility() {
      if (document.visibilityState === "visible" && positionsRef.current) {
        fetchData(positionsRef.current, "/api/portfolio/refresh");
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [positions, fetchData]);

  // Switch source rows based on viewMode
  const sourceRows =
    viewMode === "holdings"
      ? portfolioData?.tableRows
      : portfolioData?.positionRows;

  const filteredRows = getFilteredRows(
    sourceRows ?? null,
    filters,
    sortConfig,
    focusedFund
  );
  const filteredTreeMapNodes = getFilteredTreeMapNodes(
    portfolioData,
    positions,
    filters
  );

  // Compute focused fund summary for the header
  const focusedSummary = getFocusedSummary(
    portfolioData,
    focusedFund
  );

  async function uploadFile(file: File) {
    setIsLoading(true);
    setError(null);
    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      savePortfolio(parsed);
      setPositions(parsed);
      await fetchData(parsed, "/api/portfolio");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to parse CSV file"
      );
    } finally {
      setIsLoading(false);
    }
  }

  function clearData() {
    clearPortfolio();
    setPositions(null);
    setPortfolioData(null);
    setError(null);
    setExpandedRows(new Set());
    setFilters({ investmentTypes: [], accounts: [] });
    setSortConfig({ key: "totalValue", direction: "desc" });
    setViewMode("holdings");
    setFocusedFund(null);
    mountedRef.current = false;
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function toggleExpand(symbol: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      return next;
    });
  }

  function handleSort(key: string) {
    setSortConfig((prev) => ({
      key,
      direction:
        prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
  }

  return {
    hasData: positions !== null,
    isLoading,
    error,
    portfolioData,
    filteredRows,
    filteredTreeMapNodes,
    filters,
    setFilters,
    sortConfig,
    handleSort,
    expandedRows,
    toggleExpand,
    uploadFile,
    clearData,
    viewMode,
    setViewMode,
    focusedFund,
    setFocusedFund,
    focusedSummary,
  };
}

// Pure functions

function getFilteredRows(
  rows: TableRow[] | null,
  filters: FilterState,
  sortConfig: SortConfig,
  focusedFund: string | null
): TableRow[] {
  if (!rows) return [];
  let filtered = rows;

  if (filters.investmentTypes.length > 0) {
    filtered = filtered.filter((r) =>
      r.investmentTypes.some((t) => filters.investmentTypes.includes(t))
    );
  }
  if (filters.accounts.length > 0) {
    filtered = filtered.filter((r) =>
      r.accounts.some((a) => filters.accounts.includes(a))
    );
  }

  // Focus filter: only show rows that have a source from the focused fund
  if (focusedFund) {
    filtered = filtered.filter((r) =>
      r.sources.some((s) => s.sourceSymbol === focusedFund)
    );
  }

  return sortTableRows(filtered, sortConfig);
}

function getFocusedSummary(
  portfolioData: PortfolioData | null,
  focusedFund: string | null
): { value: number; gainLoss: number; gainLossPercent: number; name: string; color: string } | null {
  if (!portfolioData || !focusedFund) return null;

  // Find the fund's depth-1 node in the treemap
  const fundNode = portfolioData.treeMapNodes.find(
    (n) => n.depth === 1 && n.symbol === focusedFund
  );
  if (!fundNode) return null;

  return {
    value: fundNode.value,
    gainLoss: fundNode.totalGainLossDollar ?? 0,
    gainLossPercent: fundNode.totalGainLossPercent ?? 0,
    name: fundNode.name,
    color: fundNode.color,
  };
}

function getFilteredTreeMapNodes(
  portfolioData: PortfolioData | null,
  positions: FidelityPosition[] | null,
  filters: FilterState
): TreeMapNode[] {
  if (!portfolioData) return [];
  let nodes = portfolioData.treeMapNodes;

  if (filters.investmentTypes.length > 0 || filters.accounts.length > 0) {
    const filteredSymbols = new Set<string>();

    if (positions) {
      for (const pos of positions) {
        const matchType =
          filters.investmentTypes.length === 0 ||
          filters.investmentTypes.includes(pos.investmentType);
        const matchAccount =
          filters.accounts.length === 0 ||
          filters.accounts.includes(pos.accountName);
        if (matchType && matchAccount) {
          filteredSymbols.add(pos.symbol);
        }
      }
    }

    nodes = nodes.filter((n) => {
      if (n.depth === 1) return filteredSymbols.has(n.symbol);
      if (n.depth === 2 && n.parentSymbol)
        return filteredSymbols.has(n.parentSymbol);
      return true;
    });
  }

  return nodes;
}
