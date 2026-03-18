"use client";

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
import { formatDollar, formatHeaderCurrency } from "@/lib/utils";
import { AnimatedNumber } from "./primitives/AnimatedNumber";
import { GainLoss } from "./primitives/GainLoss";
import { ResetFiltersButton } from "./primitives/ResetFiltersButton";
import { TreeMap } from "./TreeMap";
import { PortfolioTable } from "./PortfolioTable";
import { FloatingToolbar } from "./FloatingToolbar";
import { FetchStatusBadge } from "./primitives/FetchStatusBadge";
import { cn } from "@/lib/utils";

interface DashboardProps {
  portfolioData: PortfolioData;
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
  onClearData: () => void;
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
}

export function Dashboard({
  portfolioData,
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
  onClearData,
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
}: DashboardProps) {
  const { summary, lastUpdated } = portfolioData;
  const searchQuery = filters.searchQuery ?? "";
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
  const isFiltered = activeSummary !== null;
  const headerLabel = isFiltered ? activeSummary.label : "Your portfolio";

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    onFiltersChange({
      ...filters,
      searchQuery: event.target.value,
    });
  }

  return (
    <div
      className={cn(
        "min-h-screen",
        enableIntroAnimation && "animate-fade-in",
        isMobile ? "pb-8" : "pb-20"
      )}
    >
      {/* Sticky Header */}
      <header className="sticky-header sticky top-0 z-40">
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
              <div className="mb-2 flex min-h-9 min-w-0 items-center gap-2">
                <div className="h-9 w-9 shrink-0">
                  {isFiltered && (
                    <ResetFiltersButton
                      onClick={onResetFilters}
                      className={cn(
                        "min-h-9 w-9 shrink-0 shadow-sm",
                        enableIntroAnimation && "animate-scale-in",
                        "border border-red-200/70 bg-red-50 text-red-700 hover:bg-red-100",
                        "dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/15"
                      )}
                    />
                  )}
                </div>
                <h1
                  className={cn(
                    "truncate text-sm font-medium transition-colors duration-300 max-w-[500px]",
                    isFiltered ? "text-text-primary" : "text-text-muted"
                  )}
                >
                  {headerLabel}
                </h1>
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

              <button
                type="button"
                onClick={onClearData}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2.5",
                  "text-sm font-medium shadow-sm transition-all duration-200 cursor-pointer hover-lift press-down",
                  "border border-red-200/70 bg-red-50 text-red-700 hover:bg-red-100",
                  "dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/15"
                )}
                title="Clear the uploaded file"
                aria-label="Clear file"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <path d="m19 6-1 14H6L5 6" />
                </svg>
                <span>Clear file</span>
              </button>

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
        <div
          data-testid="portfolio-search-shell"
          className={cn(
            "sticky sticky-header z-30 mb-4 py-3",
            isMobile ? "-mx-4 px-4" : "-mx-6 px-6",
            isMobile ? "top-[5.75rem]" : "top-[7rem]"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn("relative min-w-0 flex-1", !isMobile && "max-w-xl lg:max-w-2xl")}>
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
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
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search by name or symbol"
                aria-label="Search portfolio"
                className={cn(
                  "w-full rounded-xl border border-border bg-surface/95 py-2.5 pl-10 pr-3 text-sm text-text-primary shadow-[var(--shadow-sm)] backdrop-blur-xl",
                  "outline-none transition-colors placeholder:text-text-muted hover:border-border/80 focus:border-border"
                )}
              />
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
