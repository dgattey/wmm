"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { hasActivePortfolioFilters } from "@/lib/portfolioFilters";
import { getFilteredRows } from "@/lib/portfolioSelectors";
import { formatDollar, formatHeaderCurrency } from "@/lib/utils";
import { AnimatedNumber } from "./primitives/AnimatedNumber";
import { GainLoss } from "./primitives/GainLoss";
import { ResetFiltersButton } from "./primitives/ResetFiltersButton";
import { TreeMap } from "./TreeMap";
import { PortfolioTable } from "./PortfolioTable";
import { FloatingToolbar } from "./FloatingToolbar";
import { FetchStatusBadge } from "./primitives/FetchStatusBadge";
import { cn } from "@/lib/utils";
import { useIsStickyDocked } from "@/hooks/useIsStickyDocked";

interface DashboardProps {
  portfolioData: PortfolioData;
  portfolioName: string;
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
}

export function Dashboard({
  portfolioData,
  portfolioName,
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
}: DashboardProps) {
  const { summary, lastUpdated } = portfolioData;
  const searchQueryFromFilters = filters.searchQuery ?? "";
  const [searchInput, setSearchInput] = useState(searchQueryFromFilters);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSearchInput(searchQueryFromFilters);
  }, [searchQueryFromFilters]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const visibleHoldingCount =
    viewMode === "holdings"
      ? filteredRows.length
      : getFilteredRows(
          portfolioData.tableRows,
          filters,
          sortConfig,
          selectedFunds
        ).length;

  const displayValue = activeSummary?.value ?? summary.totalValue;
  const displayGainLoss = activeSummary?.gainLoss ?? summary.totalGainLoss;
  const displayGainLossPercent =
    activeSummary?.gainLossPercent ?? summary.totalGainLossPercent;
  const isFiltered = hasActivePortfolioFilters(filters, selectedFunds);

  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const headerRef = useRef<HTMLElement>(null);
  const [dockSentinelRef, isSearchDocked, headerHeightPx] = useIsStickyDocked(headerRef);

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setSearchInput(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        onFiltersChange({ ...filtersRef.current, searchQuery: value });
      }, 250);
    },
    [onFiltersChange]
  );

  const handleClearSearch = useCallback(() => {
    setSearchInput("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = null;
    onFiltersChange({ ...filtersRef.current, searchQuery: "" });
  }, [onFiltersChange]);

  return (
    <div
      className={cn(
        "min-h-screen overflow-x-clip",
        enableIntroAnimation && "animate-fade-in",
        isMobile ? "pb-8" : "pb-20"
      )}
    >
      {/* Sticky Header — grows with animated padding when search bar docks */}
      <header
        ref={headerRef}
        className={cn(
          "sticky-header sticky top-0 z-40 transition-[padding] duration-200 ease-out",
          isSearchDocked && "pb-[3.5rem]"
        )}
      >
        <div
          className={cn(
            "max-w-[1400px] mx-auto py-5",
            isMobile ? "px-4" : "px-6"
          )}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div
              className={cn("min-w-0", enableIntroAnimation && "animate-soft-rise")}
              style={{ "--enter-delay": "40ms" } as CSSProperties}
            >
              <div className="mb-2 flex min-w-0 items-center gap-3">
                {isFiltered ? (
                  <ResetFiltersButton
                    onClick={onResetFilters}
                    className={cn(
                      "min-h-9 w-9 shrink-0 shadow-sm",
                      enableIntroAnimation && "animate-scale-in",
                      "border border-red-200/70 bg-red-50 text-red-700 hover:bg-red-100",
                      "dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/15"
                    )}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={onBackToPicker}
                    className={cn(
                      "inline-flex min-h-9 min-w-9 items-center justify-center rounded-full border border-border/70",
                      "bg-surface text-text-primary shadow-sm transition-all duration-200 cursor-pointer hover:bg-surface-hover hover-lift press-down",
                      enableIntroAnimation && "animate-scale-in"
                    )}
                    title="Back to portfolios"
                    aria-label="Back to portfolios"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </button>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-medium text-text-muted">Your portfolio</div>
                  <h1 className="truncate text-sm font-semibold text-text-primary md:text-base">
                    {portfolioName}
                  </h1>
                  {activeSummary && (
                    <p className="truncate text-xs text-text-muted">
                      {activeSummary.label}
                    </p>
                  )}
                </div>
              </div>

              <div
                className={cn(
                  "gap-x-6 gap-y-3",
                  isMobile
                    ? "flex flex-col items-start"
                    : "flex flex-wrap items-end"
                )}
              >
                <div
                  className="min-w-fit shrink-0"
                  title={`Market value: ${formatDollar(displayValue)}`}
                >
                  <AnimatedNumber
                    value={displayValue}
                    format={formatHeaderCurrency}
                    animate={enableValueAnimations}
                    className={cn(
                      "font-bold text-text-primary whitespace-nowrap",
                      isMobile ? "text-[clamp(2rem,10vw,2.6rem)]" : "text-3xl md:text-5xl"
                    )}
                  />
                  <p className="mt-1 text-xs text-text-muted">
                    Current market value
                  </p>
                </div>
                <div
                  className={cn("min-w-0", !isMobile && "self-end")}
                  title={`Unrealized gain: ${formatDollar(displayGainLoss)} / Return on cost basis: ${displayGainLossPercent.toFixed(2)}%`}
                >
                  <GainLoss
                    dollar={displayGainLoss}
                    percent={displayGainLossPercent}
                    size={isMobile ? "sm" : "md"}
                    className={cn(isMobile ? "text-lg" : "text-xl md:text-2xl")}
                    formatDollarValue={formatHeaderCurrency}
                  />
                  <p className="mt-1 text-xs text-text-muted">
                    Unrealized gain / return on cost basis
                  </p>
                </div>
              </div>
            </div>

            <div
              className={cn(
                "flex shrink-0 flex-col items-start justify-center gap-2 md:items-end",
                enableIntroAnimation && "animate-soft-rise"
              )}
              style={{ "--enter-delay": "120ms" } as CSSProperties}
            >
              {fetchError && (
                <FetchStatusBadge
                  error={fetchError}
                  hasData
                  className="max-w-full self-stretch md:self-auto"
                />
              )}

              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  Loading...
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* TreeMap */}
      <section
        className={cn(
          isMobile ? "pt-2" : "pt-6",
          "mb-6 max-w-[1400px] mx-auto",
          enableIntroAnimation && "animate-soft-rise",
          isMobile ? "px-4" : "px-6"
        )}
        style={{ "--enter-delay": "160ms" } as CSSProperties}
      >
        <TreeMap
          key={filteredTreeMapNodes.length > 0 ? "treemap-populated" : "treemap-empty"}
          nodes={filteredTreeMapNodes}
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
            lastUpdated={lastUpdated}
            onRefresh={onRefresh ?? (() => {})}
            isRefreshing={isRefreshing}
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

      {/* Table */}
      <section
        className={cn(
          "max-w-[1400px] mx-auto",
          enableIntroAnimation && "animate-soft-rise",
          isMobile ? "px-4" : "px-6"
        )}
        style={{ "--enter-delay": "220ms" } as CSSProperties}
      >
        <div ref={dockSentinelRef} className="h-px" aria-hidden />
        <div
          data-testid="portfolio-search-shell"
          className={cn(
            "sticky mb-4 py-3",
            "transition-[background-color,backdrop-filter,box-shadow,top] duration-200 ease-out",
            "w-screen relative",
            isSearchDocked
              ? "search-bar-docked z-50"
              : "bg-transparent z-40"
          )}
          style={{
            marginLeft: "calc(-50vw + 50%)",
            marginRight: "calc(-50vw + 50%)",
            top:
              headerHeightPx > 0
                ? headerHeightPx
                : isMobile
                  ? 92
                  : 112,
          }}
        >
          <div
            className={cn(
              "flex items-center gap-3",
              isMobile ? "px-4" : "px-6",
              "max-w-[1400px] mx-auto"
            )}
          >
            <div className={cn("relative min-w-0 flex-1", !isMobile && "max-w-xl lg:max-w-2xl")}>
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 z-10 text-text-muted"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                role="searchbox"
                value={searchInput}
                onChange={handleSearchChange}
                placeholder="Search by name or symbol"
                aria-label="Search portfolio"
                className={cn(
                  "w-full rounded-xl border border-border bg-surface/95 py-2.5 pl-10 text-sm text-text-primary shadow-[var(--shadow-sm)] backdrop-blur-xl",
                  "outline-none transition-colors placeholder:text-text-muted hover:border-border/80 focus:border-border",
                  searchInput.length > 0 ? "pr-10" : "pr-3"
                )}
              />
              {searchInput.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className={cn(
                    "absolute right-3 top-1/2 -translate-y-1/2",
                    "inline-flex h-6 w-6 items-center justify-center rounded-full",
                    "text-text-muted hover:text-text-primary hover:bg-surface-hover",
                    "transition-colors cursor-pointer"
                  )}
                  aria-label="Clear search"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              )}
            </div>
            <p
              data-testid="inline-holdings-count"
              className="shrink-0 self-center text-center text-sm text-text-muted"
            >
              {visibleHoldingCount.toLocaleString()}{" "}
              {visibleHoldingCount === 1 ? "holding" : "holdings"}
            </p>
          </div>
        </div>

        <PortfolioTable
          rows={filteredRows}
          sortConfig={sortConfig}
          onSort={onSort}
          expandedRows={expandedRows}
          onToggleExpand={onToggleExpand}
          isMobile={isMobile}
          enableIntroAnimation={enableIntroAnimation}
          enableValueAnimations={enableValueAnimations}
        />
      </section>

      {!isMobile && (
        <FloatingToolbar
          summary={summary}
          filters={filters}
          onFiltersChange={onFiltersChange}
          lastUpdated={lastUpdated}
          onRefresh={onRefresh ?? (() => {})}
          isRefreshing={isRefreshing}
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
