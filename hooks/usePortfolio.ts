"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
} from "react";
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
import {
  savePortfolio,
  savePortfolioData,
  loadPortfolio,
  loadPortfolioData,
  clearPortfolio,
} from "@/lib/storage";
import {
  buildFlatHoldingTreeMapNodes,
  filterFundTreeMapNodes,
  getFundOptions,
  relayoutTreeMapNodes,
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
        savePortfolioData(data);
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

  useLayoutEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const saved = loadPortfolio();
    if (saved) {
      const cachedPortfolioData = loadPortfolioData();
      setPositions(saved);
      if (cachedPortfolioData) {
        setPortfolioData(cachedPortfolioData);
      }
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

  const filteredFundTreeMapNodes = getFilteredTreeMapNodes(portfolioData, filters);
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
  const activeSummary = getActivePortfolioSummary(
    positions,
    filters,
    selectedFunds
  );
  const filteredTreeMapNodes =
    treeMapGrouping === "fund"
      ? filterFundTreeMapNodes(filteredFundTreeMapNodes, selectedFunds)
      : buildFlatHoldingTreeMapNodes({
          rows: portfolioData?.tableRows ?? [],
          filters,
          selectedFunds,
          totalPortfolioValue:
            activeSummary?.value ?? portfolioData?.summary.totalValue ?? 0,
          width: TREE_MAP_WIDTH,
          height: TREE_MAP_HEIGHT,
        });

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

export function getFilteredRows(
  rows: TableRow[] | null,
  filters: FilterState,
  sortConfig: SortConfig,
  selectedFunds: string[]
): TableRow[] {
  if (!rows) return [];
  const filtered = rows
    .map((row) => buildVisibleRow(row, filters, selectedFunds))
    .filter((row): row is TableRow => row !== null);
  const visibleTotalValue = filtered.reduce((sum, row) => sum + row.totalValue, 0);

  return sortTableRows(
    filtered.map((row) => ({
      ...row,
      percentOfPortfolio:
        visibleTotalValue > 0 ? (row.totalValue / visibleTotalValue) * 100 : 0,
      sources: row.sources.map((source) => ({
        ...source,
        percentOfPortfolio:
          visibleTotalValue > 0 ? (source.value / visibleTotalValue) * 100 : 0,
      })),
    })),
    sortConfig
  );
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

export function getFilteredTreeMapNodes(
  portfolioData: PortfolioData | null,
  filters: FilterState
): TreeMapNode[] {
  if (!portfolioData) return [];
  if (filters.investmentTypes.length === 0 && filters.accounts.length === 0) {
    return portfolioData.treeMapNodes;
  }

  return relayoutTreeMapNodes(
    portfolioData.treeMapNodes.filter((node) => matchesTreeMapNodeFilters(node, filters)),
    TREE_MAP_WIDTH,
    TREE_MAP_HEIGHT
  );
}

function buildVisibleRow(
  row: TableRow,
  filters: FilterState,
  selectedFunds: string[]
): TableRow | null {
  const visibleSources = row.sources.filter(
    (source) =>
      matchesSourceFilters(source.account, source.investmentType, filters) &&
      matchesRowSourceFundSelection(
        row.symbol,
        source.type,
        source.sourceSymbol,
        selectedFunds
      )
  );

  if (visibleSources.length === 0) {
    return null;
  }

  const totalValue = visibleSources.reduce((sum, source) => sum + source.value, 0);
  const totalGainLossDollar = visibleSources.reduce(
    (sum, source) => sum + (source.totalGainLossDollar ?? 0),
    0
  );
  const totalCostBasis = visibleSources.reduce(
    (sum, source) => sum + (source.costBasisTotal ?? 0),
    0
  );

  return {
    ...row,
    accounts: [...new Set(visibleSources.map((source) => source.account))],
    investmentTypes: [
      ...new Set(visibleSources.map((source) => source.investmentType)),
    ],
    totalValue,
    percentOfPortfolio: 0,
    totalGainLossDollar,
    totalGainLossPercent:
      totalCostBasis > 0 ? (totalGainLossDollar / totalCostBasis) * 100 : 0,
    isExpandable: visibleSources.length > 1,
    sources: visibleSources.map((source) => ({
      ...source,
    })),
  };
}

function matchesSourceFilters(
  account: string,
  investmentType: string,
  filters: FilterState
): boolean {
  const matchesAccount =
    filters.accounts.length === 0 || filters.accounts.includes(account);
  const matchesType =
    filters.investmentTypes.length === 0 ||
    filters.investmentTypes.includes(investmentType);

  return matchesAccount && matchesType;
}

function matchesRowSourceFundSelection(
  rowSymbol: string,
  sourceType: "direct" | "fund",
  sourceSymbol: string,
  selectedFunds: string[]
): boolean {
  if (selectedFunds.length === 0) {
    return true;
  }

  if (selectedFunds.includes(sourceSymbol)) {
    return true;
  }

  return sourceType === "direct" && selectedFunds.includes(rowSymbol);
}

function matchesTreeMapNodeFilters(
  node: TreeMapNode,
  filters: FilterState
): boolean {
  const matchesAccount =
    filters.accounts.length === 0 ||
    (node.account ? filters.accounts.includes(node.account) : false);
  const matchesType =
    filters.investmentTypes.length === 0 ||
    (node.investmentType
      ? filters.investmentTypes.includes(node.investmentType)
      : false);

  return matchesAccount && matchesType;
}
