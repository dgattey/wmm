"use client";

import type {
  FundOption,
  PortfolioData,
  TreeMapNode,
  TableRow,
  FilterState,
  SortConfig,
  TreeMapGrouping,
  ViewMode,
} from "@/lib/types";
import { formatDollar } from "@/lib/utils";
import { SlidingNumber } from "./primitives/SlidingNumber";
import { GainLoss } from "./primitives/GainLoss";
import { TreeMap } from "./TreeMap";
import { PortfolioTable } from "./PortfolioTable";
import { FloatingToolbar } from "./FloatingToolbar";
import { HeaderFundSelector } from "./HeaderFundSelector";
import { cn } from "@/lib/utils";

interface DashboardProps {
  portfolioData: PortfolioData;
  filteredTreeMapNodes: TreeMapNode[];
  filteredRows: TableRow[];
  isMobile: boolean;
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
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
  selectedFundsSummary: {
    value: number;
    gainLoss: number;
    gainLossPercent: number;
    label: string;
  } | null;
  treeMapWidth: number;
  treeMapHeight: number;
}

export function Dashboard({
  portfolioData,
  filteredTreeMapNodes,
  filteredRows,
  isMobile,
  filters,
  onFiltersChange,
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
  selectedFundsSummary,
  treeMapWidth,
  treeMapHeight,
}: DashboardProps) {
  const { summary, lastUpdated } = portfolioData;

  const displayValue = selectedFundsSummary?.value ?? summary.totalValue;
  const displayGainLoss =
    selectedFundsSummary?.gainLoss ?? summary.totalGainLoss;
  const displayGainLossPercent =
    selectedFundsSummary?.gainLossPercent ?? summary.totalGainLossPercent;
  const headerLabel = selectedFundsSummary
    ? selectedFundsSummary.label
    : "Portfolio Allocation";

  return (
    <div
      className={cn(
        "min-h-screen animate-fade-in",
        isMobile ? "pb-8" : "pb-20"
      )}
    >
      {/* Sticky Header */}
      <header className="sticky-header sticky top-0 z-30">
        <div
          className={cn(
            "max-w-[1400px] mx-auto py-5",
            isMobile ? "px-4" : "px-6"
          )}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="mb-1">
                <h1
                  className={cn(
                    "text-sm font-medium transition-colors duration-300 truncate max-w-[500px]",
                    selectedFundsSummary ? "text-text-primary" : "text-text-muted"
                  )}
                >
                  {headerLabel}
                </h1>
              </div>

              <div
                className={cn(
                  "gap-4",
                  isMobile
                    ? "flex flex-col items-start"
                    : "flex items-baseline"
                )}
              >
                <SlidingNumber
                  value={displayValue}
                  format={formatDollar}
                  className={cn(
                    "font-bold text-text-primary",
                    isMobile ? "text-[clamp(2rem,10vw,2.6rem)]" : "text-3xl"
                  )}
                />
                <GainLoss
                  dollar={displayGainLoss}
                  percent={displayGainLossPercent}
                  size={isMobile ? "sm" : "md"}
                />
              </div>

              <HeaderFundSelector
                funds={fundOptions}
                selectedFunds={selectedFunds}
                onToggleFund={onToggleFund}
                onClearFunds={onClearFunds}
              />
            </div>

            <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
              <button
                type="button"
                onClick={onClearData}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2.5",
                  "text-sm font-medium shadow-sm transition-all duration-200 cursor-pointer",
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
          "mb-6 max-w-[1400px] mx-auto",
          isMobile ? "px-4" : "px-6"
        )}
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
            isMobile
          />
        </section>
      )}

      {/* Table */}
      <section
        className={cn(
          "max-w-[1400px] mx-auto",
          isMobile ? "px-4" : "px-6"
        )}
      >
        <PortfolioTable
          rows={filteredRows}
          sortConfig={sortConfig}
          onSort={onSort}
          expandedRows={expandedRows}
          onToggleExpand={onToggleExpand}
          isMobile={isMobile}
        />
      </section>

      {/* Floating Toolbar */}
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
        />
      )}
    </div>
  );
}
