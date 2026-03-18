"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type {
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
const DESKTOP_TREE_MAP_LAYOUT = {
  width: 1200,
  height: 400,
};
const MOBILE_TREE_MAP_LAYOUT = {
  width: 720,
  height: 640,
};
const MOBILE_BREAKPOINT_QUERY = "(max-width: 767px)";

export function usePortfolio() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches;
  });
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
  const lastLayoutModeRef = useRef<"mobile" | "desktop" | null>(null);

  positionsRef.current = positions;
  const treeMapLayout = isMobile
    ? MOBILE_TREE_MAP_LAYOUT
    : DESKTOP_TREE_MAP_LAYOUT;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT_QUERY);
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(event.matches);
    };

    handleChange(mediaQuery);

    if ("addEventListener" in mediaQuery) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const fetchData = useCallback(
    async (pos: FidelityPosition[], endpoint: string) => {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            positions: pos,
            width: treeMapLayout.width,
            height: treeMapLayout.height,
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
    [treeMapLayout]
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
    const layoutMode = isMobile ? "mobile" : "desktop";
    if (lastLayoutModeRef.current === layoutMode) return;
    lastLayoutModeRef.current = layoutMode;

    if (!positionsRef.current || !mountedRef.current) {
      return;
    }

    void fetchData(positionsRef.current, "/api/portfolio/refresh");
  }, [fetchData, isMobile]);

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
          width: treeMapLayout.width,
          height: treeMapLayout.height,
        });

  // Compute selected fund summary for the header
  const selectedFundsSummary = getSelectedFundsSummary(
    portfolioData,
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
    setIsMobile(() => {
      if (typeof window === "undefined") {
        return false;
      }

      return window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches;
    });
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
    isMobile,
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
    selectedFundsSummary,
    treeMapWidth: treeMapLayout.width,
    treeMapHeight: treeMapLayout.height,
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

function getSelectedFundsSummary(
  portfolioData: PortfolioData | null,
  selectedFunds: string[]
): {
  value: number;
  gainLoss: number;
  gainLossPercent: number;
  label: string;
} | null {
  if (!portfolioData || selectedFunds.length === 0) return null;

  const fundGroups = new Map<
    string,
    {
      name: string;
      value: number;
      gainLoss: number;
      estimatedCostBasis: number;
    }
  >();

  for (const node of portfolioData.treeMapNodes) {
    if (node.depth !== 1 || !selectedFunds.includes(node.symbol)) {
      continue;
    }

    const existing = fundGroups.get(node.symbol);
    if (existing) {
      existing.value += node.value;
      existing.gainLoss += node.totalGainLossDollar ?? 0;
      existing.estimatedCostBasis += estimateCostBasis(node);
      continue;
    }

    fundGroups.set(node.symbol, {
      name: node.name,
      value: node.value,
      gainLoss: node.totalGainLossDollar ?? 0,
      estimatedCostBasis: estimateCostBasis(node),
    });
  }

  const fundGroupsList = [...fundGroups.values()];
  if (fundGroupsList.length === 0) return null;

  const value = fundGroupsList.reduce((sum, group) => sum + group.value, 0);
  const gainLoss = fundGroupsList.reduce(
    (sum, group) => sum + group.gainLoss,
    0
  );
  const estimatedCostBasis = fundGroupsList.reduce(
    (sum, group) => sum + group.estimatedCostBasis,
    0
  );

  return {
    value,
    gainLoss,
    gainLossPercent:
      estimatedCostBasis > 0 ? (gainLoss / estimatedCostBasis) * 100 : 0,
    label:
      fundGroupsList.length === 1
        ? fundGroupsList[0].name
        : `${fundGroupsList.length} funds selected`,
  };
}

function estimateCostBasis(node: TreeMapNode): number {
  const gainLoss = node.totalGainLossDollar ?? 0;
  const gainLossPercent = node.totalGainLossPercent ?? 0;

  if (gainLossPercent === 0) {
    return Math.max(node.value - gainLoss, 0);
  }

  const estimated = gainLoss / (gainLossPercent / 100);
  return Number.isFinite(estimated) ? Math.abs(estimated) : 0;
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
