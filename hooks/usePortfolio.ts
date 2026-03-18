"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type {
  ActivePortfolioSummary,
  FidelityPosition,
  FilterState,
  FundOption,
  PortfolioData,
  SortConfig,
  TableRow,
  TreeMapGrouping,
  TreeMapNode,
  ViewMode,
} from "@/lib/types";
import {
  DESKTOP_TREE_MAP_LAYOUT,
  MOBILE_BREAKPOINT_QUERY,
  MOBILE_TREE_MAP_LAYOUT,
} from "@/lib/portfolioLayout";
import { parseCSV } from "@/lib/parseCSV";
import {
  sanitizeCurrentSelection,
  sanitizeSelectionForFilterChange,
  sanitizeSelectionForFundChange,
} from "@/lib/portfolioSelection";
import {
  getActivePortfolioSummary,
  getFilteredRows,
  getFilteredTreeMapNodes,
} from "@/lib/portfolioSelectors";
import {
  clearPortfolio,
  loadPortfolio,
  loadPortfolioData,
  savePortfolio,
  savePortfolioData,
} from "@/lib/storage";
import {
  buildFlatHoldingTreeMapNodes,
  filterAndRelayoutFundTreeMapNodes,
  getFundOptions,
} from "@/lib/treemap";

function createDefaultFilters(): FilterState {
  return {
    investmentTypes: [],
    accounts: [],
  };
}

function createDefaultSortConfig(): SortConfig {
  return {
    key: "totalValue",
    direction: "desc",
  };
}

function getFetchErrorMessage(
  payload: { error?: unknown; details?: unknown },
  status: number
): string {
  const error =
    typeof payload.error === "string" && payload.error.trim().length > 0
      ? payload.error.trim()
      : `Server error: ${status}`;
  const details =
    typeof payload.details === "string" && payload.details.trim().length > 0
      ? payload.details.trim()
      : null;

  if (!details || details === error) {
    return error;
  }

  return `${error}: ${details}`;
}

function getInitialIsMobile(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches;
}

export interface UsePortfolioResult {
  hasData: boolean;
  isMobile: boolean;
  isLoading: boolean;
  error: string | null;
  restoredFromStorage: boolean;
  portfolioData: PortfolioData | null;
  filteredRows: TableRow[];
  filteredTreeMapNodes: TreeMapNode[];
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  sortConfig: SortConfig;
  handleSort: (key: string) => void;
  expandedRows: Set<string>;
  toggleExpand: (symbol: string) => void;
  uploadFile: (file: File) => Promise<void>;
  refreshData: () => Promise<void>;
  isRefreshing: boolean;
  clearData: () => void;
  viewMode: ViewMode;
  setViewMode: Dispatch<SetStateAction<ViewMode>>;
  treeMapGrouping: TreeMapGrouping;
  setTreeMapGrouping: Dispatch<SetStateAction<TreeMapGrouping>>;
  selectedFunds: string[];
  toggleFundSelection: (symbol: string) => void;
  clearSelectedFunds: () => void;
  resetFilters: () => void;
  fundOptions: FundOption[];
  treeMapWidth: number;
  treeMapHeight: number;
  activeSummary: ActivePortfolioSummary | null;
}

export function usePortfolio(): UsePortfolioResult {
  const [isMobile, setIsMobile] = useState(getInitialIsMobile);
  const [positions, setPositions] = useState<FidelityPosition[] | null>(null);
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoredFromStorage, setRestoredFromStorage] = useState(false);

  const [filters, setFiltersState] = useState<FilterState>(createDefaultFilters);
  const [sortConfig, setSortConfig] = useState<SortConfig>(createDefaultSortConfig);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("holdings");
  const [treeMapGrouping, setTreeMapGrouping] =
    useState<TreeMapGrouping>("fund");
  const [selectedFunds, setSelectedFundsState] = useState<string[]>([]);

  const mountedRef = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const positionsRef = useRef<FidelityPosition[] | null>(null);
  const filtersRef = useRef(filters);
  const selectedFundsRef = useRef(selectedFunds);

  positionsRef.current = positions;
  filtersRef.current = filters;
  selectedFundsRef.current = selectedFunds;

  const treeMapLayout = isMobile
    ? MOBILE_TREE_MAP_LAYOUT
    : DESKTOP_TREE_MAP_LAYOUT;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
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
          throw new Error(getFetchErrorMessage(errData, res.status));
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
    [treeMapLayout.height, treeMapLayout.width]
  );

  useLayoutEffect(() => {
    if (mountedRef.current) {
      return;
    }

    mountedRef.current = true;

    const saved = loadPortfolio();
    if (!saved) {
      setIsLoading(false);
      return;
    }

    resetInitialScrollPosition();
    const cachedPortfolioData = loadPortfolioData();
    setRestoredFromStorage(true);
    setPositions(saved);
    if (cachedPortfolioData) {
      setPortfolioData(cachedPortfolioData);
    }
    fetchData(saved, "/api/portfolio").finally(() => setIsLoading(false));
  }, [fetchData]);

  const refreshData = useCallback(async () => {
    if (!positionsRef.current) return;
    setIsRefreshing(true);
    await fetchData(positionsRef.current, "/api/portfolio/refresh");
    setIsRefreshing(false);
  }, [fetchData]);

  const sourceRows =
    viewMode === "holdings"
      ? portfolioData?.tableRows
      : portfolioData?.positionRows;

  const filteredFundTreeMapNodes = getFilteredTreeMapNodes(
    portfolioData,
    filters,
    treeMapLayout.width,
    treeMapLayout.height
  );
  const fundOptions = getFundOptions(filteredFundTreeMapNodes);

  useEffect(() => {
    if (!positions) {
      return;
    }

    const sanitized = sanitizeCurrentSelection(positions, filters, selectedFunds);

    if (!areStringArraysEqual(selectedFunds, sanitized.selectedFunds)) {
      setSelectedFundsState(sanitized.selectedFunds);
    }

    if (
      !areStringArraysEqual(filters.accounts, sanitized.filters.accounts) ||
      !areStringArraysEqual(
        filters.investmentTypes,
        sanitized.filters.investmentTypes
      )
    ) {
      setFiltersState(sanitized.filters);
    }
  }, [filters, positions, selectedFunds]);

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
      ? filterAndRelayoutFundTreeMapNodes(
          filteredFundTreeMapNodes,
          selectedFunds,
          treeMapLayout.width,
          treeMapLayout.height
        )
      : buildFlatHoldingTreeMapNodes({
          rows: portfolioData?.tableRows ?? [],
          filters,
          selectedFunds,
          totalPortfolioValue:
            activeSummary?.value ?? portfolioData?.summary.totalValue ?? 0,
          width: treeMapLayout.width,
          height: treeMapLayout.height,
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
    setRestoredFromStorage(false);
    setExpandedRows(new Set());
    setFiltersState(createDefaultFilters());
    setSelectedFundsState([]);
    setTreeMapGrouping("fund");
    setSortConfig(createDefaultSortConfig());
    setViewMode("holdings");
    setIsMobile(getInitialIsMobile());
    mountedRef.current = false;
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

  function setFilters(nextFilters: FilterState) {
    const sanitized = sanitizeSelectionForFilterChange(
      positionsRef.current,
      filtersRef.current,
      nextFilters,
      selectedFundsRef.current
    );
    setFiltersState(sanitized.filters);
    setSelectedFundsState(sanitized.selectedFunds);
  }

  function toggleFundSelection(symbol: string) {
    const nextSelectedFunds = selectedFundsRef.current.includes(symbol)
      ? selectedFundsRef.current.filter((selected) => selected !== symbol)
      : [...selectedFundsRef.current, symbol];
    const sanitized = sanitizeSelectionForFundChange(
      positionsRef.current,
      filtersRef.current,
      nextSelectedFunds
    );
    setFiltersState(sanitized.filters);
    setSelectedFundsState(sanitized.selectedFunds);
  }

  function clearSelectedFunds() {
    setSelectedFundsState([]);
  }

  function resetFilters() {
    setFiltersState(createDefaultFilters());
    setSelectedFundsState([]);
  }

  return {
    hasData: positions !== null,
    isMobile,
    isLoading,
    error,
    restoredFromStorage,
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
    refreshData,
    isRefreshing,
    clearData,
    viewMode,
    setViewMode,
    treeMapGrouping,
    setTreeMapGrouping,
    selectedFunds,
    toggleFundSelection,
    clearSelectedFunds,
    resetFilters,
    fundOptions,
    treeMapWidth: treeMapLayout.width,
    treeMapHeight: treeMapLayout.height,
    activeSummary,
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

function areStringArraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
