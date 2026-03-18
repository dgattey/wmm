"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type {
  ActivePortfolioSummary,
  FidelityPosition,
  PortfolioData,
  FilterState,
  SortConfig,
  TableRow,
  TreeMapNode,
  TreeMapGrouping,
  ViewMode,
} from "@/lib/types";
import { parseCSV } from "@/lib/parseCSV";
import { sortTableRows } from "@/lib/tableSort";
import { savePortfolio, loadPortfolio, clearPortfolio } from "@/lib/storage";
import {
  buildFlatHoldingTreeMapNodes,
  filterFundTreeMapNodes,
  getFundOptions,
} from "@/lib/treemap";

const POLL_INTERVAL = 5000;
const TREE_MAP_WIDTH = 1200;
const TREE_MAP_HEIGHT = 400;

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
  const [treeMapGrouping, setTreeMapGrouping] =
    useState<TreeMapGrouping>("fund");
  const [selectedFunds, setSelectedFunds] = useState<string[]>([]);

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
          body: JSON.stringify({
            positions: pos,
            width: TREE_MAP_WIDTH,
            height: TREE_MAP_HEIGHT,
          }),
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

  const filteredFundTreeMapNodes = getFilteredTreeMapNodes(
    portfolioData,
    positions,
    filters
  );
  const fundOptions = getFundOptions(filteredFundTreeMapNodes);

  useEffect(() => {
    const availableFunds = new Set(fundOptions.map((fund) => fund.symbol));

    setSelectedFunds((prev) => {
      const next = prev.filter((symbol) => availableFunds.has(symbol));
      return next.length === prev.length ? prev : next;
    });
  }, [fundOptions]);

  const filteredRows = getFilteredRows(
    sourceRows ?? null,
    filters,
    sortConfig,
    selectedFunds
  );
  const filteredTreeMapNodes =
    treeMapGrouping === "fund"
      ? filterFundTreeMapNodes(filteredFundTreeMapNodes, selectedFunds)
      : buildFlatHoldingTreeMapNodes({
          rows: portfolioData?.tableRows ?? [],
          filters,
          selectedFunds,
          totalPortfolioValue: portfolioData?.summary.totalValue ?? 0,
          width: TREE_MAP_WIDTH,
          height: TREE_MAP_HEIGHT,
        });

  const activeSummary = getActivePortfolioSummary(
    positions,
    filters,
    selectedFunds
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
    setSelectedFunds([]);
    setTreeMapGrouping("fund");
    setSortConfig({ key: "totalValue", direction: "desc" });
    setViewMode("holdings");
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

  function toggleFundSelection(symbol: string) {
    setSelectedFunds((prev) =>
      prev.includes(symbol)
        ? prev.filter((selected) => selected !== symbol)
        : [...prev, symbol]
    );
  }

  function clearSelectedFunds() {
    setSelectedFunds([]);
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
    treeMapGrouping,
    setTreeMapGrouping,
    selectedFunds,
    toggleFundSelection,
    clearSelectedFunds,
    fundOptions,
    activeSummary,
  };
}

// Pure functions

function getFilteredRows(
  rows: TableRow[] | null,
  filters: FilterState,
  sortConfig: SortConfig,
  selectedFunds: string[]
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

  if (selectedFunds.length > 0) {
    filtered = filtered.filter((r) =>
      selectedFunds.includes(r.symbol) ||
      r.sources.some((s) => selectedFunds.includes(s.sourceSymbol))
    );
  }

  return sortTableRows(filtered, sortConfig);
}

function getActivePortfolioSummary(
  positions: FidelityPosition[] | null,
  filters: FilterState,
  selectedFunds: string[]
): ActivePortfolioSummary | null {
  const hasActiveFilters =
    filters.investmentTypes.length > 0 ||
    filters.accounts.length > 0 ||
    selectedFunds.length > 0;

  if (!positions || !hasActiveFilters) return null;

  const matchedPositions = positions.filter(
    (position) =>
      matchesPositionFilters(position, filters) &&
      matchesFundSelection(position, selectedFunds)
  );
  if (matchedPositions.length === 0) return null;

  const value = matchedPositions.reduce(
    (sum, position) => sum + position.currentValue,
    0
  );
  const gainLoss = matchedPositions.reduce(
    (sum, position) => sum + position.totalGainLossDollar,
    0
  );
  const costBasis = matchedPositions.reduce(
    (sum, position) => sum + position.costBasisTotal,
    0
  );

  return {
    value,
    gainLoss,
    gainLossPercent: costBasis > 0 ? (gainLoss / costBasis) * 100 : 0,
    label: getActiveSummaryLabel(matchedPositions, filters, selectedFunds),
  };
}

function getActiveSummaryLabel(
  matchedPositions: FidelityPosition[],
  filters: FilterState,
  selectedFunds: string[]
): string {
  const hasAccountFilter = filters.accounts.length > 0;
  const hasTypeFilter = filters.investmentTypes.length > 0;
  const hasFundFilter = selectedFunds.length > 0;

  if (!hasAccountFilter && !hasTypeFilter && hasFundFilter) {
    if (selectedFunds.length === 1) {
      return matchedPositions.find(
        (position) => position.symbol === selectedFunds[0]
      )?.description ?? selectedFunds[0];
    }

    return `${selectedFunds.length} funds selected`;
  }

  if (hasAccountFilter && !hasTypeFilter && !hasFundFilter) {
    return filters.accounts[0];
  }

  if (!hasAccountFilter && hasTypeFilter && !hasFundFilter) {
    return filters.investmentTypes.length === 1
      ? filters.investmentTypes[0]
      : `${filters.investmentTypes.length} types selected`;
  }

  return "Filtered portfolio";
}

function matchesPositionFilters(
  position: FidelityPosition,
  filters: FilterState
): boolean {
  const matchType =
    filters.investmentTypes.length === 0 ||
    filters.investmentTypes.includes(position.investmentType);
  const matchAccount =
    filters.accounts.length === 0 ||
    filters.accounts.includes(position.accountName);

  return matchType && matchAccount;
}

function matchesFundSelection(
  position: FidelityPosition,
  selectedFunds: string[]
): boolean {
  return (
    selectedFunds.length === 0 || selectedFunds.includes(position.symbol)
  );
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
        if (matchesPositionFilters(pos, filters)) {
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
