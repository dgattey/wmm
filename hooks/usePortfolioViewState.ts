"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
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
import {
  getActivePortfolioSummary,
  getFilteredRows,
  getFilteredTreeMapNodes,
} from "@/lib/portfolioSelectors";
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
}

interface UsePortfolioViewStateInput {
  positions: FidelityPosition[] | null;
  portfolioData: PortfolioData | null;
  isMobile: boolean;
  resetKey: string;
}

export function usePortfolioViewState({
  positions,
  portfolioData,
  isMobile,
  resetKey,
}: UsePortfolioViewStateInput): PortfolioViewState {
  const [filters, setFiltersState] = useState<FilterState>(createDefaultFilters);
  const [sortConfig, setSortConfig] = useState<SortConfig>(createDefaultSortConfig);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("holdings");
  const [treeMapGrouping, setTreeMapGrouping] =
    useState<TreeMapGrouping>("fund");
  const [selectedFunds, setSelectedFundsState] = useState<string[]>([]);

  const treeMapLayout = isMobile
    ? MOBILE_TREE_MAP_LAYOUT
    : DESKTOP_TREE_MAP_LAYOUT;

  useEffect(() => {
    setExpandedRows(new Set());
    setFiltersState(createDefaultFilters());
    setSelectedFundsState([]);
    setTreeMapGrouping("fund");
    setSortConfig(createDefaultSortConfig());
    setViewMode("holdings");
  }, [resetKey]);

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

  const sourceRows =
    viewMode === "holdings"
      ? portfolioData?.tableRows
      : portfolioData?.positionRows;

  const filteredFundTreeMapNodes = useMemo(
    () =>
      getFilteredTreeMapNodes(
        portfolioData,
        filters,
        treeMapLayout.width,
        treeMapLayout.height
      ),
    [filters, portfolioData, treeMapLayout.height, treeMapLayout.width]
  );

  const fundOptions = useMemo(
    () => getFundOptions(filteredFundTreeMapNodes),
    [filteredFundTreeMapNodes]
  );

  const filteredRows = useMemo(
    () => getFilteredRows(sourceRows ?? null, filters, sortConfig, selectedFunds),
    [filters, selectedFunds, sortConfig, sourceRows]
  );

  const activeSummary = useMemo(
    () => getActivePortfolioSummary(positions, filters, selectedFunds),
    [filters, positions, selectedFunds]
  );

  const filteredTreeMapNodes = useMemo(
    () =>
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
          }),
    [
      activeSummary?.value,
      filteredFundTreeMapNodes,
      filters,
      portfolioData?.summary.totalValue,
      portfolioData?.tableRows,
      selectedFunds,
      treeMapGrouping,
      treeMapLayout.height,
      treeMapLayout.width,
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
      filters,
      nextFilters,
      selectedFunds
    );
    setFiltersState(sanitized.filters);
    setSelectedFundsState(sanitized.selectedFunds);
  }

  function toggleFundSelection(symbol: string) {
    const nextSelectedFunds = selectedFunds.includes(symbol)
      ? selectedFunds.filter((selected) => selected !== symbol)
      : [...selectedFunds, symbol];
    const sanitized = sanitizeSelectionForFundChange(
      positions,
      filters,
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
    filteredRows,
    filteredTreeMapNodes,
    filters,
    setFilters,
    sortConfig,
    handleSort,
    expandedRows,
    toggleExpand,
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

function areStringArraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
