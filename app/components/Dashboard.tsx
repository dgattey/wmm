"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import type {
  ActivePortfolioSummary,
  FundOption,
  PortfolioData,
  TreeMapNode,
  TableRow,
  FilterState,
  SortConfig,
  TreeMapGrouping,
  ViewMode,
} from "@/lib/types";
import { getFilteredRows } from "@/lib/portfolioSelectors";
import { cn } from "@/lib/utils";
import { useIsStickyDocked } from "@/hooks/useIsStickyDocked";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { portfolioViewTransitionShell } from "@/lib/portfolioViewTransition";
import { buildEmptyFilterTreeMapNode } from "@/lib/treemapEmptyNode";
import { TreeMap } from "./TreeMap";
import { PortfolioTable } from "./PortfolioTable";
import { FloatingToolbar } from "./FloatingToolbar";
import { DashboardHeader, DashboardSearchBar } from "./DashboardHeader";

interface DashboardProps {
  portfolioData: PortfolioData;
  portfolioName: string;
  portfolioId?: string;
  onRenamePortfolio?: (portfolioId: string, name: string) => void;
  filteredTreeMapNodes: TreeMapNode[];
  filteredRows: TableRow[];
  isMobile: boolean;
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
  onResetFilters: () => void;
  sortConfig: SortConfig;
  onSort: (key: string) => void;
  expandedRows: Set<string>;
  onToggleExpand: (symbol: string) => void;
  onBackToPicker: () => void;
  isLoading: boolean;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  treeMapGrouping: TreeMapGrouping;
  onTreeMapGroupingChange: (mode: TreeMapGrouping) => void;
  selectedFunds: string[];
  onToggleFund: (symbol: string) => void;
  onClearFunds: () => void;
  fundOptions: FundOption[];
  activeSummary: ActivePortfolioSummary | null;
  treeMapWidth: number;
  treeMapHeight: number;
  enableIntroAnimation?: boolean;
  enableValueAnimations?: boolean;
  fetchError?: string | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  viewTransitionPortfolioId?: string;
}

export function Dashboard({
  portfolioData,
  portfolioName,
  portfolioId,
  onRenamePortfolio,
  filteredTreeMapNodes,
  filteredRows,
  isMobile,
  filters,
  onFiltersChange,
  onResetFilters,
  sortConfig,
  onSort,
  expandedRows,
  onToggleExpand,
  onBackToPicker,
  isLoading,
  viewMode,
  onViewModeChange,
  treeMapGrouping,
  onTreeMapGroupingChange,
  selectedFunds,
  onToggleFund,
  onClearFunds,
  fundOptions,
  activeSummary,
  treeMapWidth,
  treeMapHeight,
  enableIntroAnimation = true,
  enableValueAnimations = true,
  fetchError,
  onRefresh,
  isRefreshing = false,
  viewTransitionPortfolioId,
}: DashboardProps) {
  const searchQueryFromFilters = filters.searchQuery ?? "";
  const [searchInput, setSearchInput] = useState(searchQueryFromFilters);
  const debouncedSearchInput = useDebouncedValue(searchInput, 250);

  useEffect(() => {
    setSearchInput(searchQueryFromFilters);
  }, [searchQueryFromFilters]);

  const visibleHoldingCount = useMemo(() => {
    if (viewMode === "holdings") {
      return filteredRows.length;
    }

    // `filters.searchQuery` only updates after `debouncedSearchInput` flushes,
    // so this stays stable while the user is typing quickly.
    return getFilteredRows(portfolioData.tableRows, filters, sortConfig, selectedFunds).length;
  }, [filteredRows.length, filters, portfolioData.tableRows, selectedFunds, sortConfig, viewMode]);

  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    const currentSearch = filtersRef.current.searchQuery ?? "";
    if (currentSearch === debouncedSearchInput) {
      return;
    }

    filtersRef.current = { ...filtersRef.current, searchQuery: debouncedSearchInput };
    onFiltersChange(filtersRef.current);
  }, [debouncedSearchInput, onFiltersChange]);

  const headerRef = useRef<HTMLElement>(null);
  const searchShellRef = useRef<HTMLDivElement>(null);
  const [dockSentinelRef, isSearchDocked, headerHeightPx] = useIsStickyDocked(headerRef);
  const [searchShellHeightPx, setSearchShellHeightPx] = useState(0);

  useEffect(() => {
    const el = searchShellRef.current;
    if (!el) return;
    const update = () => setSearchShellHeightPx(el.getBoundingClientRect().height);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setSearchInput(value);
    },
    []
  );

  const handleClearSearch = useCallback(() => {
    setSearchInput("");
    const currentSearch = filtersRef.current.searchQuery ?? "";
    if (currentSearch) {
      filtersRef.current = { ...filtersRef.current, searchQuery: "" };
      onFiltersChange(filtersRef.current);
    }
  }, [onFiltersChange]);

  const vtShellStyle =
    viewTransitionPortfolioId !== undefined
      ? ({ viewTransitionName: portfolioViewTransitionShell(viewTransitionPortfolioId) } as CSSProperties)
      : undefined;

  const { summary } = portfolioData;

  /** Filters are active but nothing matches (e.g. search with no hits) — keep layout height and show dash metrics. */
  const filterEmptyNoResults =
    activeSummary !== null && filteredRows.length === 0;

  const treeMapNodesForView = useMemo(
    () =>
      filterEmptyNoResults
        ? [buildEmptyFilterTreeMapNode(treeMapWidth, treeMapHeight)]
        : filteredTreeMapNodes,
    [filterEmptyNoResults, filteredTreeMapNodes, treeMapHeight, treeMapWidth]
  );

  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-x-clip pb-8",
        enableIntroAnimation && "animate-fade-in"
      )}
      style={vtShellStyle}
    >
      <div
        aria-hidden
        data-testid="sticky-shared-backdrop"
        className={cn(
          "sticky-shared-backdrop sticky top-0 pointer-events-none z-30",
          isSearchDocked && "is-search-docked"
        )}
        style={
          {
            "--sticky-header-height": `${headerHeightPx}px`,
            "--sticky-search-height": `${searchShellHeightPx}px`,
          } as CSSProperties
        }
      />

      {/* Sticky Header */}
      <header
        ref={headerRef}
        className={cn(
          "sticky-header sticky top-0 z-40",
          isSearchDocked && "is-search-docked"
        )}
      >
        <DashboardHeader
          portfolioData={portfolioData}
          portfolioName={portfolioName}
          portfolioId={portfolioId}
          onRenamePortfolio={onRenamePortfolio}
          onBackToPicker={onBackToPicker}
          activeSummary={activeSummary}
          filterEmptyNoResults={filterEmptyNoResults}
          isMobile={isMobile}
          isSearchDocked={isSearchDocked}
          isLoading={isLoading}
          enableIntroAnimation={enableIntroAnimation}
          enableValueAnimations={enableValueAnimations}
          fetchError={fetchError}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          viewTransitionPortfolioId={viewTransitionPortfolioId}
        />
      </header>

      {/* TreeMap */}
      <section
        className={cn(
          isMobile ? "pt-2" : "pt-6",
          "mb-6 max-w-[1400px] mx-auto overflow-x-clip",
          enableIntroAnimation && "animate-soft-rise",
          isMobile ? "px-4" : "px-6"
        )}
        style={{ "--enter-delay": "160ms" } as CSSProperties}
      >
        <TreeMap
          key={filterEmptyNoResults ? "treemap-empty-filter" : "treemap-populated"}
          nodes={treeMapNodesForView}
          originalWidth={treeMapWidth}
          originalHeight={treeMapHeight}
          grouping={treeMapGrouping}
          selectedFunds={selectedFunds}
          onToggleFund={onToggleFund}
          onClearFunds={onClearFunds}
          isMobile={isMobile}
          enableIntroAnimation={enableIntroAnimation}
        />
      </section>

      {isMobile && (
        <section className="px-4 mb-6 max-w-[1400px] mx-auto">
          <FloatingToolbar
            summary={summary}
            filters={filters}
            onFiltersChange={onFiltersChange}
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
            treeMapGrouping={treeMapGrouping}
            onTreeMapGroupingChange={onTreeMapGroupingChange}
            fundOptions={fundOptions}
            selectedFunds={selectedFunds}
            onToggleFund={onToggleFund}
            onClearFunds={onClearFunds}
            onResetFilters={onResetFilters}
            isMobile
            enableIntroAnimation={enableIntroAnimation}
          />
        </section>
      )}

      {/* Sentinel + sticky search are direct children of this tall root so sticky’s scroll range
          includes the table below. A short wrapper section would scroll away and “lose” the bar
          while `.sticky-shared-backdrop` keeps painting (blank gap). */}
      <div ref={dockSentinelRef} className="h-px" aria-hidden />
      <div
        ref={searchShellRef}
        data-testid="portfolio-search-shell"
        className={cn(
          "sticky mb-4 py-3 w-screen relative z-[35]",
          "bg-transparent",
          enableIntroAnimation && "animate-soft-rise"
        )}
        style={
          {
            marginLeft: "calc(-50vw + 50%)",
            marginRight: "calc(-50vw + 50%)",
            top: headerHeightPx > 0 ? headerHeightPx : isMobile ? 92 : 112,
            "--enter-delay": "220ms",
          } as CSSProperties
        }
      >
        <DashboardSearchBar
          searchInput={searchInput}
          onSearchChange={handleSearchChange}
          onClearSearch={handleClearSearch}
          visibleHoldingCount={visibleHoldingCount}
          isMobile={isMobile}
          isSearchDocked={isSearchDocked}
        />
      </div>

      <section
        className={cn(
          "max-w-[1400px] mx-auto overflow-x-clip",
          enableIntroAnimation && "animate-soft-rise",
          isMobile ? "px-4" : "px-6"
        )}
        style={{ "--enter-delay": "260ms" } as CSSProperties}
      >
        <PortfolioTable
          rows={filteredRows}
          sortConfig={sortConfig}
          onSort={onSort}
          expandedRows={expandedRows}
          onToggleExpand={onToggleExpand}
          viewMode={viewMode}
          isMobile={isMobile}
          enableIntroAnimation={enableIntroAnimation}
          enableValueAnimations={enableValueAnimations}
          filterEmptyNoResults={filterEmptyNoResults}
        />
      </section>

      {!isMobile && (
        <FloatingToolbar
          summary={summary}
          filters={filters}
          onFiltersChange={onFiltersChange}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          treeMapGrouping={treeMapGrouping}
          onTreeMapGroupingChange={onTreeMapGroupingChange}
          fundOptions={fundOptions}
          selectedFunds={selectedFunds}
          onToggleFund={onToggleFund}
          onClearFunds={onClearFunds}
          onResetFilters={onResetFilters}
          enableIntroAnimation={enableIntroAnimation}
        />
      )}
    </div>
  );
}
