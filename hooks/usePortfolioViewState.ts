"use client";

import {
  useCallback,
  useMemo,
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
  MOBILE_TREE_MAP_LAYOUT,
} from "@/lib/portfolioLayout";
import {
  sanitizeCurrentSelection,
  sanitizeSelectionForFilterChange,
  sanitizeSelectionForFundChange,
} from "@/lib/portfolioSelection";
import { hasSearchQuery } from "@/lib/portfolioFilters";
import {
  collectSearchMatchedPositionSymbols,
  getActivePortfolioSummary,
  getFilteredRows,
  getFilteredTreeMapNodes,
} from "@/lib/portfolioSelectors";
import {
  buildFlatHoldingTreeMapNodes,
  filterAndRelayoutFundTreeMapNodes,
  getFundOptions,
} from "@/lib/treemap";
import {
  arePortfolioUrlStatesEqual,
  DEFAULT_FILTER_STATE,
  normalizePortfolioUrlState,
  type PortfolioUrlState,
} from "@/lib/urlFilters";

export interface PortfolioViewState {
  filteredRows: TableRow[];
  filteredTreeMapNodes: TreeMapNode[];
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  sortConfig: SortConfig;
  handleSort: (key: string) => void;
  expandedRows: Set<string>;
  toggleExpand: (symbol: string) => void;
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
  syncWithUrlState: (urlState: PortfolioUrlState) => void;
}

interface UsePortfolioViewStateInput {
  positions: FidelityPosition[] | null;
  portfolioData: PortfolioData | null;
  isMobile: boolean;
  initialUrlState?: PortfolioUrlState;
}

export function usePortfolioViewState({
  positions,
  portfolioData,
  isMobile,
  initialUrlState,
}: UsePortfolioViewStateInput): PortfolioViewState {
  const normalizedInitialUrlState = useMemo(
    () => normalizePortfolioUrlState(initialUrlState),
    [initialUrlState]
  );
  const [filters, setFiltersState] = useState<FilterState>(
    normalizedInitialUrlState.filters
  );
  const [sortConfig, setSortConfig] = useState<SortConfig>(
    normalizedInitialUrlState.sortConfig
  );
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>(
    normalizedInitialUrlState.viewMode
  );
  const [treeMapGrouping, setTreeMapGrouping] =
    useState<TreeMapGrouping>(normalizedInitialUrlState.treeMapGrouping);
  const [selectedFunds, setSelectedFundsState] = useState<string[]>(
    normalizedInitialUrlState.selectedFunds
  );

  const treeMapLayout = isMobile
    ? MOBILE_TREE_MAP_LAYOUT
    : DESKTOP_TREE_MAP_LAYOUT;

  const currentSelection = useMemo(
    () =>
      positions
        ? sanitizeCurrentSelection(positions, filters, selectedFunds)
        : { filters, selectedFunds },
    [filters, positions, selectedFunds]
  );
  const effectiveFilters = currentSelection.filters;
  const effectiveSelectedFunds = currentSelection.selectedFunds;

  const sourceRows =
    viewMode === "holdings"
      ? portfolioData?.tableRows
      : portfolioData?.positionRows;

  const searchMatchedPositionSymbols = useMemo(() => {
    if (
      viewMode !== "positions" ||
      !hasSearchQuery(effectiveFilters) ||
      !portfolioData?.tableRows
    ) {
      return null;
    }
    return collectSearchMatchedPositionSymbols(
      portfolioData.tableRows,
      effectiveFilters,
      effectiveSelectedFunds
    );
  }, [effectiveFilters, effectiveSelectedFunds, portfolioData, viewMode]);

  const filteredFundTreeMapNodes = useMemo(
    () =>
      getFilteredTreeMapNodes(
        portfolioData,
        effectiveFilters,
        treeMapLayout.width,
        treeMapLayout.height
      ),
    [effectiveFilters, portfolioData, treeMapLayout.height, treeMapLayout.width]
  );

  const fundOptions = useMemo(
    () => getFundOptions(filteredFundTreeMapNodes),
    [filteredFundTreeMapNodes]
  );

  const filteredRows = useMemo(
    () =>
      getFilteredRows(
        sourceRows ?? null,
        effectiveFilters,
        sortConfig,
        effectiveSelectedFunds,
        searchMatchedPositionSymbols
      ),
    [
      effectiveFilters,
      effectiveSelectedFunds,
      searchMatchedPositionSymbols,
      sortConfig,
      sourceRows,
    ]
  );

  const activeSummary = useMemo(
    () => getActivePortfolioSummary(positions, effectiveFilters, effectiveSelectedFunds),
    [effectiveFilters, positions, effectiveSelectedFunds]
  );

  const filteredTreeMapNodes = useMemo(
    () =>
      treeMapGrouping === "fund"
        ? filterAndRelayoutFundTreeMapNodes(
            filteredFundTreeMapNodes,
            effectiveSelectedFunds,
            treeMapLayout.width,
            treeMapLayout.height
          )
        : buildFlatHoldingTreeMapNodes({
            rows: portfolioData?.tableRows ?? [],
            filters: effectiveFilters,
            selectedFunds: effectiveSelectedFunds,
            totalPortfolioValue:
              activeSummary?.value ?? portfolioData?.summary.totalValue ?? 0,
            width: treeMapLayout.width,
            height: treeMapLayout.height,
          }),
    [
      treeMapGrouping,
      filteredFundTreeMapNodes,
      effectiveSelectedFunds,
      effectiveFilters,
      portfolioData,
      activeSummary,
      treeMapLayout.width,
      treeMapLayout.height,
    ]
  );

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
      positions,
      effectiveFilters,
      nextFilters,
      effectiveSelectedFunds
    );
    setFiltersState(sanitized.filters);
    setSelectedFundsState(sanitized.selectedFunds);
  }

  function toggleFundSelection(symbol: string) {
    const nextSelectedFunds = effectiveSelectedFunds.includes(symbol)
      ? effectiveSelectedFunds.filter((selected) => selected !== symbol)
      : [...effectiveSelectedFunds, symbol];
    const sanitized = sanitizeSelectionForFundChange(
      positions,
      effectiveFilters,
      nextSelectedFunds
    );
    setFiltersState(sanitized.filters);
    setSelectedFundsState(sanitized.selectedFunds);
  }

  function clearSelectedFunds() {
    setSelectedFundsState([]);
  }

  function resetFilters() {
    setFiltersState({ ...DEFAULT_FILTER_STATE });
    setSelectedFundsState([]);
  }

  const syncWithUrlState = useCallback(
    (urlState: PortfolioUrlState) => {
      const nextUrlState = normalizePortfolioUrlState(urlState);
      // Compare URL to what the UI actually shows (effective selection), not raw
      // useState, so we do not spuriously sync when sanitize* trimmed accounts/types.
      if (
        arePortfolioUrlStatesEqual(
          {
            filters: effectiveFilters,
            selectedFunds: effectiveSelectedFunds,
            sortConfig,
            viewMode,
            treeMapGrouping,
          },
          nextUrlState
        )
      ) {
        return;
      }

      setFiltersState(nextUrlState.filters);
      setSelectedFundsState(nextUrlState.selectedFunds);
      setSortConfig(nextUrlState.sortConfig);
      setViewMode(nextUrlState.viewMode);
      setTreeMapGrouping(nextUrlState.treeMapGrouping);
      setExpandedRows(new Set());
    },
    [
      effectiveFilters,
      effectiveSelectedFunds,
      sortConfig,
      treeMapGrouping,
      viewMode,
    ]
  );

  return {
    filteredRows,
    filteredTreeMapNodes,
    filters: effectiveFilters,
    setFilters,
    sortConfig,
    handleSort,
    expandedRows,
    toggleExpand,
    viewMode,
    setViewMode,
    treeMapGrouping,
    setTreeMapGrouping,
    selectedFunds: effectiveSelectedFunds,
    toggleFundSelection,
    clearSelectedFunds,
    resetFilters,
    fundOptions,
    treeMapWidth: treeMapLayout.width,
    treeMapHeight: treeMapLayout.height,
    activeSummary,
    syncWithUrlState,
  };
}
