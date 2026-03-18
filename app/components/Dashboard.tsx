"use client";

import type { CSSProperties } from "react";
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
import { formatDollar } from "@/lib/utils";
import { SlidingNumber } from "./primitives/SlidingNumber";
import { GainLoss } from "./primitives/GainLoss";
import { TreeMap } from "./TreeMap";
import { PortfolioTable } from "./PortfolioTable";
import { FloatingToolbar } from "./FloatingToolbar";
import { cn } from "@/lib/utils";

interface DashboardProps {
  portfolioData: PortfolioData;
  filteredTreeMapNodes: TreeMapNode[];
  filteredRows: TableRow[];
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
  activeSummary: ActivePortfolioSummary | null;
}

export function Dashboard({
  portfolioData,
  filteredTreeMapNodes,
  filteredRows,
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
  activeSummary,
}: DashboardProps) {
  const { summary, lastUpdated } = portfolioData;

  const displayValue = activeSummary?.value ?? summary.totalValue;
  const displayGainLoss = activeSummary?.gainLoss ?? summary.totalGainLoss;
  const displayGainLossPercent =
    activeSummary?.gainLossPercent ?? summary.totalGainLossPercent;
  const headerLabel = activeSummary ? activeSummary.label : "Portfolio Allocation";

  return (
    <div className="min-h-screen pb-20 animate-fade-in">
      {/* Sticky Header */}
      <header className="sticky-header sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-6 py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div
              className="min-w-0 animate-soft-rise"
              style={{ "--enter-delay": "40ms" } as CSSProperties}
            >
              <div className="mb-1">
                <h1
                  className={cn(
                    "text-sm font-medium transition-colors duration-300 truncate max-w-[500px]",
                    activeSummary ? "text-text-primary" : "text-text-muted"
                  )}
                >
                  {headerLabel}
                </h1>
              </div>

              <div className="flex items-baseline gap-4">
                <SlidingNumber
                  value={displayValue}
                  format={formatDollar}
                  className="text-3xl font-bold text-text-primary"
                />
                <GainLoss
                  dollar={displayGainLoss}
                  percent={displayGainLossPercent}
                  size="md"
                />
              </div>
            </div>

            <div
              className="flex shrink-0 flex-col items-start gap-2 md:items-end animate-soft-rise"
              style={{ "--enter-delay": "120ms" } as CSSProperties}
            >
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
        className="px-6 mb-6 max-w-[1400px] mx-auto animate-soft-rise"
        style={{ "--enter-delay": "160ms" } as CSSProperties}
      >
        <TreeMap
          nodes={filteredTreeMapNodes}
          originalWidth={1200}
          originalHeight={400}
          grouping={treeMapGrouping}
          selectedFunds={selectedFunds}
          onToggleFund={onToggleFund}
          onClearFunds={onClearFunds}
        />
      </section>

      {/* Table */}
      <section
        className="px-6 max-w-[1400px] mx-auto animate-soft-rise"
        style={{ "--enter-delay": "220ms" } as CSSProperties}
      >
        <PortfolioTable
          rows={filteredRows}
          sortConfig={sortConfig}
          onSort={onSort}
          expandedRows={expandedRows}
          onToggleExpand={onToggleExpand}
        />
      </section>

      {/* Floating Toolbar */}
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
      />
    </div>
  );
}
